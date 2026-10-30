"use client";

import React, { useState } from "react";
import { useResourceStore } from "@/store/resources";
import { useSubjectStore } from "@/store/subjects";
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
  Textarea,
  Modal,
  ConfirmDialog,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { Resource, ResourceKind } from "@/types";
import {
  FolderOpen,
  Plus,
  ExternalLink,
  BookOpen,
  FileText,
  Upload,
  BrainCircuit,
  MessageSquare,
  Trash2,
  Edit2,
  FolderPlus,
  Info,
} from "lucide-react";
import Link from "next/link";

export default function ResourcesPage() {
  const allResources = useResourceStore((s) => s.resources);
  const resources = React.useMemo(
    () =>
      [...allResources].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [allResources],
  );
  const addResource = useResourceStore((s) => s.addResource);
  const updateResource = useResourceStore((s) => s.updateResource);
  const deleteResource = useResourceStore((s) => s.deleteResource);

  const subjects = useSubjectStore((s) => s.subjects);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ResourceKind>("excerpt");
  const [content, setContent] = useState("");
  const [subjectId, setSubjectId] = useState<string>(subjects[0]?.id || "");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"library" | "browserFolder">("library");
  const [pickedFolderName, setPickedFolderName] = useState<string | null>(null);

  // File System Access API (Chrome/Edge desktop)
  const handlePickLocalFolder = async () => {
    try {
      // @ts-ignore
      if (window.showDirectoryPicker) {
        // @ts-ignore
        const dirHandle = await window.showDirectoryPicker();
        setPickedFolderName(dirHandle.name);
        // Add a resource entry
        addResource(
          `Local Folder: ${dirHandle.name}`,
          "local_file",
          `Linked folder "${dirHandle.name}" containing local study books and PDFs.`,
          subjects[0]?.id || null,
        );
      } else {
        alert("Directory picker is only supported on Chromium desktop browsers (Chrome, Edge). You can use 'Import File' or 'Add Excerpt' instead!");
      }
    } catch (err) {
      console.log("Folder pick cancelled or unsupported", err);
    }
  };

  const openCreateModal = (res?: Resource) => {
    if (res) {
      setEditingResource(res);
      setTitle(res.title);
      setKind(res.kind);
      setContent(res.content);
      setSubjectId(res.subjectId || "");
    } else {
      setEditingResource(null);
      setTitle("");
      setKind("excerpt");
      setContent("");
      setSubjectId(subjects[0]?.id || "");
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingResource) {
      updateResource(editingResource.id, {
        title: title.trim(),
        content,
        subjectId: subjectId || null,
      });
    } else {
      addResource(title.trim(), kind, content, subjectId || null);
    }
    setIsModalOpen(false);
  };

  const filteredResources = resources.filter((r) => {
    if (selectedSubjectId !== "all" && r.subjectId !== selectedSubjectId) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">
            Study Resources & Books
          </h1>
          <p className="text-sm text-ink-light">
            Reference textbooks, excerpts, and links to your learning materials.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* External website link */}
          <a
            href={process.env.NEXT_PUBLIC_RESOURCES_WEBSITE_URL || "https://welib.st/"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-semibold text-ink hover:bg-sidebar transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-sky-600" /> Open Resources Site
          </a>

          <Button size="sm" variant="secondary" onClick={handlePickLocalFolder}>
            <FolderPlus className="w-4 h-4 text-amber-600" /> Link Books Folder
          </Button>

          <Button size="sm" onClick={() => openCreateModal()}>
            <Plus className="w-4 h-4" /> Add Excerpt / Material
          </Button>
        </div>
      </div>

      {/* Honest Browser Compatibility Notice */}
      <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong>Local Folder Access note:</strong> Desktop Chrome and Edge support linking a local books folder directly via the File System Access API. On Safari, Firefox, and mobile browsers, use the <em>Add Excerpt / Material</em> button to paste text or excerpts directly.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-faint">Filter by Subject:</span>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-surface text-ink focus:outline-none"
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-ink-faint">
          {filteredResources.length} items in library
        </span>
      </div>

      {/* Resources Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-surface rounded-xl border border-border text-xs text-ink-faint">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
            No resources added yet. Link a local folder or paste an excerpt to get started.
          </div>
        ) : (
          filteredResources.map((res) => {
            const sub = subjects.find((s) => s.id === res.subjectId);
            return (
              <Card
                key={res.id}
                highlight={sub?.color}
                className="bg-surface flex flex-col justify-between hover:shadow-sm transition-shadow"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading text-base font-bold text-ink line-clamp-1">
                      {res.title}
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                      {res.kind.replace("_", " ")}
                    </span>
                  </div>

                  {sub && <Badge color={sub.color}>{sub.title}</Badge>}

                  <p className="text-xs text-ink-light line-clamp-3 leading-relaxed whitespace-pre-wrap">
                    {res.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-border mt-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/dashboard/chat?source=resource&resId=${res.id}`}
                      className="p-1 text-ink-faint hover:text-sky-600 rounded"
                      title="Ask AI about this"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href={`/dashboard/quiz?source=resource&resId=${res.id}`}
                      className="p-1 text-ink-faint hover:text-emerald-600 rounded"
                      title="Quiz on this"
                    >
                      <BrainCircuit className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openCreateModal(res)}
                      className="p-1 text-ink-faint hover:text-ink rounded"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(res.id)}
                      className="p-1 text-ink-faint hover:text-red-600 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add / Edit Resource Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingResource ? "Edit Resource" : "Add Resource / Excerpt"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Title"
            placeholder="e.g. Halliday & Resnick Ch. 23 Excerpt"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Subject"
              options={subjects.map((s) => ({ value: s.id, label: s.title }))}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            />

            <Select
              label="Kind"
              options={[
                { value: "excerpt", label: "Text Excerpt" },
                { value: "link", label: "Web Link" },
                { value: "local_file", label: "Local File Reference" },
              ]}
              value={kind}
              onChange={(e) => setKind(e.target.value as ResourceKind)}
            />
          </div>

          <Textarea
            label="Content / Notes / URL"
            rows={5}
            placeholder="Paste text, key formulas, or reference links here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Resource
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => {
          if (deletingId) deleteResource(deletingId);
        }}
        title="Delete Resource"
        message="Are you sure you want to delete this resource?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
