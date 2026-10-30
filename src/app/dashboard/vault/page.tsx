"use client";

import React, { useState } from "react";
import { useNoteStore } from "@/store/notes";
import { useSubjectStore } from "@/store/subjects";
import {
  Card,
  Button,
  Input,
  Select,
  Textarea,
  Modal,
  Badge,
  ConfirmDialog,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { Note } from "@/types";
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Edit3,
  Eye,
  RefreshCw,
  BrainCircuit,
  MessageSquare,
  Download,
  Upload,
  Tag,
  Archive,
} from "lucide-react";
import Link from "next/link";

export default function VaultPage() {
  const allNotes = useNoteStore((s) => s.notes);
  const notes = React.useMemo(
    () =>
      allNotes
        .filter((n) => !n.deletedAt)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [allNotes],
  );
  const trash = React.useMemo(
    () =>
      allNotes
        .filter((n) => Boolean(n.deletedAt))
        .sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime()),
    [allNotes],
  );
  const addNote = useNoteStore((s) => s.addNote);
  const updateNote = useNoteStore((s) => s.updateNote);
  const softDelete = useNoteStore((s) => s.softDelete);
  const restore = useNoteStore((s) => s.restore);
  const permanentDelete = useNoteStore((s) => s.permanentDelete);
  const emptyTrash = useNoteStore((s) => s.emptyTrash);

  const subjects = useSubjectStore((s) => s.subjects);

  // States
  const [selectedNote, setSelectedNote] = useState<Note | null>(notes[0] || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [viewTrash, setViewTrash] = useState(false);

  // Editor states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editSubjectId, setEditSubjectId] = useState<string>("");
  const [editTags, setEditTags] = useState("");
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("preview");

  // Deletion modal
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // Create new note
  const handleStartCreate = () => {
    setSelectedNote(null);
    setEditTitle("Untitled Note");
    setEditBody("# New Note\n\nStart writing notes, formulas, or summaries here...");
    setEditSubjectId(subjects[0]?.id || "");
    setEditTags("revision");
    setIsEditing(true);
    setEditorMode("edit");
  };

  const handleStartEdit = (note: Note) => {
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditBody(note.body);
    setEditSubjectId(note.subjectId || "");
    setEditTags(note.tags.join(", "));
    setIsEditing(true);
    setEditorMode("edit");
  };

  const handleSaveNote = () => {
    if (!editTitle.trim()) return;

    const tagsArray = editTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (selectedNote && selectedNote.id) {
      updateNote(selectedNote.id, {
        title: editTitle.trim(),
        body: editBody,
        subjectId: editSubjectId || null,
        tags: tagsArray,
      });
      setSelectedNote({
        ...selectedNote,
        title: editTitle.trim(),
        body: editBody,
        subjectId: editSubjectId || null,
        tags: tagsArray,
      });
    } else {
      const created = addNote(
        editTitle.trim(),
        editBody,
        editSubjectId || null,
        "markdown",
        tagsArray,
      );
      setSelectedNote(created);
    }
    setIsEditing(false);
  };

  // Filter notes
  const currentList = viewTrash ? trash : notes;
  const filteredNotes = currentList.filter((n) => {
    if (selectedSubjectId !== "all" && n.subjectId !== selectedSubjectId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchBody = n.body.toLowerCase().includes(q);
      const matchTags = n.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchBody && !matchTags) return false;
    }
    return true;
  });

  // Export note as .md
  const handleExport = (note: Note) => {
    const blob = new Blob([note.body], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import file
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const title = file.name.replace(/\.[^/.]+$/, "");
      const created = addNote(
        title,
        content,
        subjects[0]?.id || null,
        "markdown",
        ["imported"],
      );
      setSelectedNote(created);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">
            Notes Vault
          </h1>
          <p className="text-sm text-ink-light">
            Markdown revision notes & glossaries. Can be queried by AI and converted to quizzes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden Import file input */}
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-semibold text-ink hover:bg-sidebar transition-colors">
            <Upload className="w-3.5 h-3.5" /> Import .md
            <input
              type="file"
              accept=".md,.txt"
              onChange={handleImport}
              className="hidden"
            />
          </label>

          <Button
            size="sm"
            variant={viewTrash ? "secondary" : "ghost"}
            onClick={() => setViewTrash(!viewTrash)}
          >
            <Archive className="w-4 h-4" />
            {viewTrash ? "Back to Notes" : `Trash (${trash.length})`}
          </Button>

          <Button size="sm" onClick={handleStartCreate}>
            <Plus className="w-4 h-4" /> New Note
          </Button>
        </div>
      </div>

      {/* Main 2-Column Split: Sidebar List + Editor/Viewer */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Notes List (4 cols) */}
        <div className="md:col-span-5 space-y-3">
          {/* Search & Subject filter */}
          <div className="space-y-2 bg-surface p-3 rounded-xl border border-border">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-ink-faint" />
              <input
                type="text"
                placeholder="Search notes, tags, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>

            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-surface text-ink focus:outline-none"
            >
              <option value="all">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Notes Cards */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredNotes.length === 0 ? (
              <div className="p-8 text-center bg-surface rounded-xl border border-border text-xs text-ink-faint">
                {viewTrash ? "Trash is empty." : "No notes found. Create your first note!"}
              </div>
            ) : (
              filteredNotes.map((note) => {
                const sub = subjects.find((s) => s.id === note.subjectId);
                const isSelected = selectedNote?.id === note.id;

                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      setSelectedNote(note);
                      setIsEditing(false);
                      setEditorMode("preview");
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-surface border-brand shadow-sm"
                        : "bg-surface border-border hover:border-ink-faint"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-bold text-ink line-clamp-1">
                        {note.title}
                      </h3>
                      {sub && <Badge color={sub.color}>{sub.title}</Badge>}
                    </div>

                    <p className="text-xs text-ink-faint line-clamp-2 leading-relaxed">
                      {note.body.replace(/[#*`$\\]/g, "")}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-sidebar text-[10px] text-ink-faint">
                      <span>{formatDate(note.updatedAt)}</span>
                      <div className="flex items-center gap-1">
                        {note.tags.slice(0, 2).map((t) => (
                          <span key={t} className="bg-sidebar px-1.5 py-0.5 rounded text-ink-light">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Note / Editor (7 cols) */}
        <div className="md:col-span-7">
          {selectedNote || isEditing ? (
            <Card noPadding className="bg-surface overflow-hidden shadow-sm">
              {/* Note Header / Action Bar */}
              <div className="flex flex-wrap items-center justify-between p-3.5 border-b border-border bg-paper gap-2">
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
                    <button
                      onClick={() => setEditorMode("preview")}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                        editorMode === "preview"
                          ? "bg-brand text-white"
                          : "text-ink-light hover:text-ink"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" /> Read
                    </button>
                    <button
                      onClick={() => {
                        if (!isEditing && selectedNote) handleStartEdit(selectedNote);
                        setEditorMode("edit");
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                        editorMode === "edit"
                          ? "bg-brand text-white"
                          : "text-ink-light hover:text-ink"
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>

                  {isEditing && (
                    <Button size="sm" onClick={handleSaveNote}>
                      Save Note
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {selectedNote && !viewTrash && (
                    <>
                      <Link
                        href={`/dashboard/quiz?source=vault&noteId=${selectedNote.id}`}
                        className="p-1.5 rounded-lg border border-border hover:bg-surface text-ink-light text-xs font-semibold flex items-center gap-1"
                        title="Generate Quiz from this Note"
                      >
                        <BrainCircuit className="w-3.5 h-3.5 text-sky-600" />
                        <span className="hidden sm:inline">Quiz</span>
                      </Link>

                      <Link
                        href={`/dashboard/chat?source=vault&noteId=${selectedNote.id}`}
                        className="p-1.5 rounded-lg border border-border hover:bg-surface text-ink-light text-xs font-semibold flex items-center gap-1"
                        title="Chat about this Note"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">Ask AI</span>
                      </Link>

                      <button
                        onClick={() => handleExport(selectedNote)}
                        className="p-1.5 rounded-lg border border-border hover:bg-surface text-ink-light"
                        title="Download .md"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          softDelete(selectedNote.id);
                          setSelectedNote(null);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-ink-faint hover:text-red-600"
                        title="Move to Trash (30 days)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {viewTrash && selectedNote && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          restore(selectedNote.id);
                          setSelectedNote(null);
                        }}
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          permanentDelete(selectedNote.id);
                          setSelectedNote(null);
                        }}
                      >
                        Delete Forever
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Editor Mode */}
              {editorMode === "edit" ? (
                <div className="p-4 space-y-4">
                  <Input
                    label="Title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Note Title"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                      label="Subject"
                      options={subjects.map((s) => ({ value: s.id, label: s.title }))}
                      value={editSubjectId}
                      onChange={(e) => setEditSubjectId(e.target.value)}
                    />
                    <Input
                      label="Tags (comma-separated)"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="exam-prep, formula, lecture1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-light mb-1">
                      Markdown Content
                    </label>
                    <textarea
                      rows={18}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="w-full p-3 font-mono text-xs rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-sky-200"
                      placeholder="Write your markdown here..."
                    />
                  </div>
                </div>
              ) : (
                /* Preview Mode */
                <div className="p-6 space-y-4">
                  <div className="border-b border-border pb-3">
                    <h1 className="font-heading text-2xl font-bold text-ink">
                      {selectedNote?.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {selectedNote?.subjectId && (
                        <Badge
                          color={
                            subjects.find((s) => s.id === selectedNote.subjectId)?.color
                          }
                        >
                          {subjects.find((s) => s.id === selectedNote.subjectId)?.title}
                        </Badge>
                      )}
                      <span className="text-xs text-ink-faint">
                        Updated {selectedNote?.updatedAt && formatDate(selectedNote.updatedAt)}
                      </span>
                      {selectedNote?.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] bg-sidebar text-ink-light px-2 py-0.5 rounded-full"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Markdown rendered text */}
                  <div className="prose prose-sm max-w-none text-ink whitespace-pre-wrap font-sans leading-relaxed">
                    {selectedNote?.body}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-12 text-center text-ink-faint">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold text-ink">Select a note to read or edit</p>
              <p className="text-xs text-ink-faint mt-1">Or click "+ New Note" to create one.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
