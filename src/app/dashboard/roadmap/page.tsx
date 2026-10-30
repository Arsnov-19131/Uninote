"use client";

import React, { useState } from "react";
import { useSubjectStore } from "@/store/subjects";
import { useTopicStore } from "@/store/topics";
import {
  Card,
  Button,
  Input,
  Select,
  Modal,
  Badge,
  ProgressBar,
  ConfirmDialog,
} from "@/components/ui";
import type { SubjectColor, Topic } from "@/types";
import {
  Map,
  Plus,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  Trash2,
  Edit2,
  Sparkles,
  BrainCircuit,
  BookOpen,
  ArrowRight,
  Folder,
} from "lucide-react";
import Link from "next/link";
import { aiExtractTopics } from "@/lib/ai";

export default function RoadmapPage() {
  const subjects = useSubjectStore((s) => s.subjects);
  const addSubject = useSubjectStore((s) => s.addSubject);
  const updateSubject = useSubjectStore((s) => s.updateSubject);
  const deleteSubject = useSubjectStore((s) => s.deleteSubject);

  const topics = useTopicStore((s) => s.topics);
  const addTopic = useTopicStore((s) => s.addTopic);
  const updateTopic = useTopicStore((s) => s.updateTopic);
  const deleteTopic = useTopicStore((s) => s.deleteTopic);
  const toggleCovered = useTopicStore((s) => s.toggleCovered);
  const getTopicsBySubject = useTopicStore((s) => s.getTopicsBySubject);
  const getChildTopics = useTopicStore((s) => s.getChildTopics);
  const getCoverage = useTopicStore((s) => s.getCoveragePercent);

  // Subject accordion open state
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({
    [subjects[0]?.id || ""]: true,
  });

  // Modals
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectTitle, setSubjectTitle] = useState("");
  const [subjectColor, setSubjectColor] = useState<SubjectColor>("yellow");
  const [subjectExamDate, setSubjectExamDate] = useState("");

  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [topicTargetSubjectId, setTopicTargetSubjectId] = useState("");
  const [parentTopicId, setParentTopicId] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState("");

  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);
  const [syllabusText, setSyllabusText] = useState("");
  const [syllabusSubjectId, setSyllabusSubjectId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);

  const toggleSubjectOpen = (id: string) => {
    setOpenSubjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectTitle.trim()) return;

    if (editingSubjectId) {
      updateSubject(editingSubjectId, {
        title: subjectTitle.trim(),
        color: subjectColor,
        examDate: subjectExamDate || undefined,
      });
    } else {
      const created = addSubject(subjectTitle.trim(), subjectColor, subjectExamDate || undefined);
      setOpenSubjects((prev) => ({ ...prev, [created.id]: true }));
    }
    setIsSubjectModalOpen(false);
  };

  const handleSaveTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim()) return;

    addTopic(topicTargetSubjectId, topicTitle.trim(), parentTopicId);
    setTopicTitle("");
    setIsTopicModalOpen(false);
  };

  // AI syllabus extractor (Gemini through /api/ai)
  const handleAIGenerateTopics = async () => {
    if (!syllabusText.trim() || !syllabusSubjectId) return;
    setIsGenerating(true);
    setAiError(null);

    const subject = subjects.find((s) => s.id === syllabusSubjectId);
    const result = await aiExtractTopics({
      subjectTitle: subject ? subject.title : "",
      text: syllabusText,
    });

    if (!result.ok) {
      setAiError(result.error);
      setIsGenerating(false);
      return;
    }

    result.data.topics.forEach((topic) => {
      const parent = addTopic(syllabusSubjectId, topic.title);
      topic.children.forEach((child) => addTopic(syllabusSubjectId, child, parent.id));
    });

    setIsGenerating(false);
    setIsSyllabusModalOpen(false);
    setSyllabusText("");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">
            Subject Roadmap
          </h1>
          <p className="text-sm text-ink-light">
            Syllabus breakdown with progress checklists. Ticks automatically update your readiness score.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setSyllabusSubjectId(subjects[0]?.id || "");
              setAiError(null);
              setIsSyllabusModalOpen(true);
            }}
          >
            <Sparkles className="w-4 h-4 text-sky-600" />
            AI Import Syllabus
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingSubjectId(null);
              setSubjectTitle("");
              setSubjectColor("yellow");
              setSubjectExamDate("");
              setIsSubjectModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" /> Add Subject
          </Button>
        </div>
      </div>

      {/* Subjects Accordion List */}
      <div className="space-y-4">
        {subjects.map((sub) => {
          const isOpen = openSubjects[sub.id] ?? false;
          const subjectTopics = getTopicsBySubject(sub.id);
          const topLevelTopics = subjectTopics.filter((t) => !t.parentTopicId);
          const coverage = getCoverage(sub.id);

          return (
            <Card key={sub.id} highlight={sub.color} noPadding className="bg-surface overflow-hidden">
              {/* Subject Header Bar */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-paper transition-colors border-b border-border"
                onClick={() => toggleSubjectOpen(sub.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button className="text-ink-faint p-0.5">
                    {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-heading text-lg font-bold text-ink">
                        {sub.title}
                      </h2>
                      <Badge color={sub.color}>
                        {coverage}% covered
                      </Badge>
                      {sub.examDate && (
                        <span className="text-xs text-ink-faint">
                          Exam: {new Date(sub.examDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="hidden sm:block w-36 mr-2">
                    <ProgressBar
                      value={coverage}
                      color={coverage === 100 ? "bg-emerald-500" : "bg-sky-500"}
                    />
                  </div>

                  <button
                    onClick={() => {
                      setTopicTargetSubjectId(sub.id);
                      setParentTopicId(null);
                      setTopicTitle("");
                      setIsTopicModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg border border-border hover:bg-sidebar text-ink text-xs font-medium flex items-center gap-1"
                    title="Add Topic"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Topic</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingSubjectId(sub.id);
                      setSubjectTitle(sub.title);
                      setSubjectColor(sub.color);
                      setSubjectExamDate(sub.examDate || "");
                      setIsSubjectModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg hover:bg-sidebar text-ink-faint hover:text-ink"
                    title="Edit Subject"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDeletingSubjectId(sub.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-ink-faint hover:text-red-600"
                    title="Delete Subject"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Topics Body */}
              {isOpen && (
                <div className="p-4 bg-paper/40 space-y-2">
                  {topLevelTopics.length === 0 ? (
                    <div className="py-6 text-center text-xs text-ink-faint">
                      No topics added yet. Click "+ Topic" or "AI Import Syllabus" to populate this subject.
                    </div>
                  ) : (
                    topLevelTopics.map((parent) => {
                      const children = getChildTopics(parent.id);
                      return (
                        <div
                          key={parent.id}
                          className="bg-surface rounded-xl border border-border p-3 space-y-2 shadow-xs"
                        >
                          {/* Parent Topic Row */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                onClick={() => toggleCovered(parent.id)}
                                className="text-sky-600 hover:text-sky-700 transition-colors shrink-0"
                              >
                                {parent.covered ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-ink-faint" />
                                )}
                              </button>
                              <span
                                className={`text-sm font-semibold ${
                                  parent.covered ? "line-through text-ink-faint" : "text-ink"
                                }`}
                              >
                                {parent.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  setTopicTargetSubjectId(sub.id);
                                  setParentTopicId(parent.id);
                                  setTopicTitle("");
                                  setIsTopicModalOpen(true);
                                }}
                                className="text-[11px] px-2 py-0.5 rounded bg-sidebar hover:bg-border text-ink-light"
                                title="Add Sub-topic"
                              >
                                + Sub-topic
                              </button>
                              <Link
                                href={`/dashboard/quiz?subject=${sub.id}&topic=${parent.id}`}
                                className="p-1 text-ink-faint hover:text-sky-600 rounded"
                                title="Quiz on this topic"
                              >
                                <BrainCircuit className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                onClick={() => setDeletingTopicId(parent.id)}
                                className="p-1 text-ink-faint hover:text-red-600 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Nested Sub-topics */}
                          {children.length > 0 && (
                            <div className="pl-6 border-l-2 border-border space-y-1.5 ml-2 mt-2">
                              {children.map((child) => (
                                <div
                                  key={child.id}
                                  className="flex items-center justify-between gap-2 py-1"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <button
                                      onClick={() => toggleCovered(child.id)}
                                      className="text-sky-600 hover:text-sky-700 transition-colors shrink-0"
                                    >
                                      {child.covered ? (
                                        <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Square className="w-3.5 h-3.5 text-ink-faint" />
                                      )}
                                    </button>
                                    <span
                                      className={`text-xs ${
                                        child.covered ? "line-through text-ink-faint" : "text-ink-light"
                                      }`}
                                    >
                                      {child.title}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <Link
                                      href={`/dashboard/quiz?subject=${sub.id}&topic=${child.id}`}
                                      className="p-1 text-ink-faint hover:text-sky-600 rounded"
                                      title="Quiz on this subtopic"
                                    >
                                      <BrainCircuit className="w-3 h-3" />
                                    </Link>
                                    <button
                                      onClick={() => setDeletingTopicId(child.id)}
                                      className="p-1 text-ink-faint hover:text-red-600 rounded"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* ===== Add / Edit Subject Modal ===== */}
      <Modal
        open={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title={editingSubjectId ? "Edit Subject" : "New Subject Folder"}
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          <Input
            label="Subject Title"
            placeholder="e.g. Organic Chemistry"
            value={subjectTitle}
            onChange={(e) => setSubjectTitle(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-ink-light mb-1.5">
              Highlighter Colour Accent
            </label>
            <div className="flex gap-2">
              {(["yellow", "mint", "pink", "sky", "violet", "orange"] as SubjectColor[]).map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setSubjectColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    c === "yellow" ? "bg-yellow-200" :
                    c === "mint" ? "bg-emerald-200" :
                    c === "pink" ? "bg-pink-200" :
                    c === "sky" ? "bg-sky-200" :
                    c === "violet" ? "bg-violet-200" : "bg-orange-200"
                  } ${subjectColor === c ? "scale-110 border-brand" : "border-transparent"}`}
                />
              ))}
            </div>
          </div>

          <Input
            type="date"
            label="Exam Date (Optional)"
            value={subjectExamDate}
            onChange={(e) => setSubjectExamDate(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsSubjectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Subject
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===== Add Topic Modal ===== */}
      <Modal
        open={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        title={parentTopicId ? "Add Sub-topic" : "Add Topic"}
      >
        <form onSubmit={handleSaveTopic} className="space-y-4">
          <Input
            label="Topic Title"
            placeholder={parentTopicId ? "e.g. Photosystem II & ATP Synthase" : "e.g. Thermodynamics"}
            value={topicTitle}
            onChange={(e) => setTopicTitle(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsTopicModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Add to Roadmap
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===== AI Import Syllabus Modal ===== */}
      <Modal
        open={isSyllabusModalOpen}
        onClose={() => setIsSyllabusModalOpen(false)}
        title="AI Syllabus & Course Outline Generator"
      >
        <div className="space-y-4">
          <p className="text-xs text-ink-light">
            Paste syllabus contents, lecture titles, or module outlines. The AI will parse topics and subtopics into a checklist.
          </p>

          <Select
            label="Target Subject"
            options={subjects.map((s) => ({ value: s.id, label: s.title }))}
            value={syllabusSubjectId}
            onChange={(e) => setSyllabusSubjectId(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-ink-light mb-1">
              Syllabus Text
            </label>
            <textarea
              rows={6}
              value={syllabusText}
              onChange={(e) => setSyllabusText(e.target.value)}
              placeholder="Unit 1: Classical Mechanics&#10;- Newton's Laws&#10;- Conservation of Energy&#10;Unit 2: Electromagnetism..."
              className="w-full text-xs p-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>

          {aiError && (
            <p
              role="alert"
              className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
            >
              {aiError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSyllabusModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isGenerating || !syllabusText.trim()}
              onClick={handleAIGenerateTopics}
            >
              {isGenerating ? "Parsing with AI..." : "Generate Checklist"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Subject Dialog */}
      <ConfirmDialog
        open={Boolean(deletingSubjectId)}
        onClose={() => setDeletingSubjectId(null)}
        onConfirm={() => {
          if (deletingSubjectId) deleteSubject(deletingSubjectId);
        }}
        title="Delete Subject"
        message="Deleting this subject will also delete its topics and disconnect associated tasks. Are you sure?"
        confirmLabel="Delete"
        danger
      />

      {/* Delete Topic Dialog */}
      <ConfirmDialog
        open={Boolean(deletingTopicId)}
        onClose={() => setDeletingTopicId(null)}
        onConfirm={() => {
          if (deletingTopicId) deleteTopic(deletingTopicId);
        }}
        title="Delete Topic"
        message="Are you sure you want to delete this topic and its nested subtopics?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
