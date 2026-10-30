"use client";

import React, { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/store/chat";
import { useSubjectStore } from "@/store/subjects";
import { useNoteStore } from "@/store/notes";
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
} from "@/components/ui";
import { formatTime } from "@/lib/utils";
import { aiExplain } from "@/lib/ai";
import type { QuizSourceType, ReadingLevel, ChatRole } from "@/types";
import {
  MessageSquare,
  Send,
  Sparkles,
  BookMarked,
  FilePlus,
  Trash2,
  Plus,
  Sliders,
  Check,
  Bookmark,
  Layers,
  ArrowRight,
  Bot,
  User,
} from "lucide-react";

export default function ChatPage() {
  const rawSessions = useChatStore((s) => s.sessions);
  const sessions = React.useMemo(
    () =>
      [...rawSessions].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [rawSessions],
  );
  const createSession = useChatStore((s) => s.createSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);
  const keywords = useChatStore((s) => s.keywords);
  const addKeyword = useChatStore((s) => s.addKeyword);
  const toggleGlossary = useChatStore((s) => s.toggleGlossary);

  const subjects = useSubjectStore((s) => s.subjects);
  const allNotes = useNoteStore((s) => s.notes);
  const notes = React.useMemo(() => allNotes.filter((n) => !n.deletedAt), [allNotes]);
  const addNote = useNoteStore((s) => s.addNote);

  // States
  const [activeSessionId, setActiveSessionId] = useState<string>(
    sessions[0]?.id || "",
  );
  const [inputPrompt, setInputPrompt] = useState("");
  const [sourceType, setSourceType] = useState<QuizSourceType>("general");
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>("simple");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || "",
  );
  const [selectedNoteId, setSelectedNoteId] = useState<string>(notes[0]?.id || "");
  const [isThinking, setIsThinking] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "keywords">("chat");
  const [savedNoteToast, setSavedNoteToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Current session & messages
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const currentMessages = messages
    .filter((m) => m.sessionId === activeSessionId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const currentKeywords = keywords.filter((k) => k.sessionId === activeSessionId);

  // Create new session
  const handleNewChat = () => {
    const session = createSession("New Study Conversation", selectedSubjectId, sourceType);
    setActiveSessionId(session.id);
  };

  // Save answer as a Note in Vault
  const handleSaveToVault = (content: string, title = "Notes from AI Chat") => {
    addNote(title, content, selectedSubjectId || null, "markdown", ["ai-notes"]);
    setSavedNoteToast("Saved to Vault!");
    setTimeout(() => setSavedNoteToast(null), 3000);
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isThinking) return;

    if (sourceType === "vault" && !notes.some((n) => n.id === selectedNoteId)) {
      setAiError("Choose a note from the vault first, or switch the source to General Knowledge.");
      return;
    }

    let targetSessionId = activeSessionId;
    if (!targetSessionId) {
      const newSession = createSession(
        inputPrompt.slice(0, 30) + "...",
        selectedSubjectId,
        sourceType,
      );
      targetSessionId = newSession.id;
      setActiveSessionId(newSession.id);
    }

    const userText = inputPrompt.trim();
    addMessage(targetSessionId, "user", userText);
    setInputPrompt("");
    setIsThinking(true);

    // Real AI answer (Gemini through /api/ai). The note text is sent only when the vault is the source.
    setAiError(null);
    const subObj = subjects.find((s) => s.id === selectedSubjectId);
    const noteObj =
      sourceType === "vault" ? notes.find((n) => n.id === selectedNoteId) : undefined;
    const sessionId = targetSessionId;
    const history = (targetSessionId === activeSessionId ? currentMessages : [])
      .filter((m) => m.role !== "system")
      .slice(-6)
      .map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

    const result = await aiExplain({
      question: userText,
      level: readingLevel,
      subjectTitle: subObj ? subObj.title : null,
      source: noteObj
        ? { title: noteObj.title, text: noteObj.body }
        : { title: null, text: null },
      history,
    });

    if (!result.ok) {
      setAiError(result.error);
      setIsThinking(false);
      return;
    }

    addMessage(sessionId, "assistant", result.data.reply);
    result.data.keywords.forEach((k) => addKeyword(sessionId, k.term, k.definition));
    setIsThinking(false);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto h-[calc(100vh-130px)] flex flex-col">
      {/* Toast Alert */}
      {savedNoteToast && (
        <div className="fixed top-16 right-4 z-50 bg-brand text-white px-4 py-2 rounded-xl text-xs shadow-lg flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          {savedNoteToast}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-sky-600" />
          <h1 className="font-heading text-lg font-bold text-ink">
            AI Study Chatbot
          </h1>
        </div>

        {/* Source Picker & Reading Level Settings */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-sidebar px-2.5 py-1 rounded-lg">
            <span className="text-ink-faint">Source:</span>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as QuizSourceType)}
              className="bg-transparent font-semibold text-ink focus:outline-none"
            >
              <option value="general">General Knowledge</option>
              <option value="vault">Notes Vault</option>
              <option value="resource">Resources</option>
            </select>
          </div>

          {sourceType === "vault" && notes.length > 0 && (
            <select
              value={selectedNoteId}
              onChange={(e) => setSelectedNoteId(e.target.value)}
              className="text-xs px-2 py-1 rounded-lg border border-border bg-surface text-ink max-w-[140px] truncate"
            >
              {notes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1.5 bg-sidebar px-2.5 py-1 rounded-lg">
            <span className="text-ink-faint">Style:</span>
            <select
              value={readingLevel}
              onChange={(e) => setReadingLevel(e.target.value as ReadingLevel)}
              className="bg-transparent font-semibold text-ink focus:outline-none"
            >
              <option value="simple">Very Simple</option>
              <option value="normal">Normal</option>
              <option value="detailed">Detailed / Exam</option>
            </select>
          </div>

          <Button size="sm" variant="secondary" onClick={handleNewChat}>
            <Plus className="w-3.5 h-3.5" /> New Chat
          </Button>
        </div>
      </div>

      {/* Main Workspace (3 columns: Sessions list, Chat feed, Keywords Panel) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0">
        {/* Left: Sessions (hidden on mobile, 3 cols) */}
        <div className="hidden md:flex md:col-span-3 flex-col bg-surface rounded-xl border border-border p-3 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-faint">
              Chats
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {sessions.map((sess) => {
              const isActive = sess.id === activeSessionId;
              const sub = subjects.find((s) => s.id === sess.subjectId);
              return (
                <div
                  key={sess.id}
                  onClick={() => setActiveSessionId(sess.id)}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors group ${
                    isActive
                      ? "bg-brand text-white"
                      : "text-ink-light hover:bg-sidebar"
                  }`}
                >
                  <div className="truncate mr-2 font-medium">
                    {sess.title}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(sess.id);
                    }}
                    className={`opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400 ${
                      isActive ? "text-gray-300" : "text-ink-faint"
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Chat Window (6 or 9 cols depending on Keywords panel) */}
        <div className="col-span-12 md:col-span-6 lg:col-span-6 flex flex-col bg-surface rounded-xl border border-border overflow-hidden">
          {/* Mobile Tab Toggle (Chat vs Keywords) */}
          <div className="flex lg:hidden border-b border-border bg-paper">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2 text-xs font-bold text-center border-b-2 ${
                activeTab === "chat" ? "border-brand text-ink" : "border-transparent text-ink-faint"
              }`}
            >
              Conversation
            </button>
            <button
              onClick={() => setActiveTab("keywords")}
              className={`flex-1 py-2 text-xs font-bold text-center border-b-2 ${
                activeTab === "keywords" ? "border-brand text-ink" : "border-transparent text-ink-faint"
              }`}
            >
              Keywords ({currentKeywords.length})
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {currentMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-ink-faint p-6">
                <Sparkles className="w-10 h-10 text-sky-400 mb-2 opacity-60" />
                <h3 className="font-heading text-base font-bold text-ink">
                  Ask Anything About Your Syllabus
                </h3>
                <p className="text-xs text-ink-faint max-w-xs mt-1">
                  "Explain photosynthesis like I'm 10" or "Help me derive the quadratic formula step by step".
                </p>
              </div>
            ) : (
              currentMessages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? "bg-brand text-white rounded-tr-none"
                          : "bg-sidebar text-ink rounded-tl-none border border-border"
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-sans">
                        {msg.content}
                      </div>

                      {!isUser && (
                        <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-ink-faint">
                          <span>{formatTime(msg.createdAt)}</span>
                          <button
                            onClick={() => handleSaveToVault(msg.content)}
                            className="flex items-center gap-1 hover:text-ink font-semibold text-sky-600 transition-colors"
                          >
                            <FilePlus className="w-3.5 h-3.5" /> Save as Note
                          </button>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {isThinking && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3 bg-sidebar rounded-2xl rounded-tl-none text-xs text-ink-faint flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse delay-100" />
                  <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse delay-200" />
                  <span>AI is thinking & extracting keywords...</span>
                </div>
              </div>
            )}
            {aiError && (
              <p
                role="alert"
                className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
              >
                {aiError}
              </p>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-border bg-surface flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask a question or describe a topic..."
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              disabled={isThinking}
              className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            <button
              type="submit"
              disabled={isThinking || !inputPrompt.trim()}
              className="p-2 rounded-lg bg-brand text-white hover:bg-brand-hover disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right: Keywords Panel (3 cols, desktop side-by-side) */}
        <div className="hidden lg:flex lg:col-span-3 flex-col bg-surface rounded-xl border border-border p-3 overflow-hidden">
          <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
            <div className="flex items-center gap-1.5">
              <BookMarked className="w-4 h-4 text-sky-600" />
              <span className="font-heading text-sm font-bold text-ink">
                Keywords Tab
              </span>
            </div>
            <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.5 rounded-full">
              {currentKeywords.length} terms
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {currentKeywords.length === 0 ? (
              <div className="text-center py-10 text-xs text-ink-faint">
                Key concepts extracted from the conversation will appear here automatically.
              </div>
            ) : (
              currentKeywords.map((kw) => (
                <div
                  key={kw.id}
                  className="p-2.5 rounded-lg border border-border bg-paper space-y-1 hover:border-ink-faint transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">
                      {kw.term}
                    </span>
                    <button
                      onClick={() => toggleGlossary(kw.id)}
                      className={`p-1 rounded ${
                        kw.savedToGlossary
                          ? "text-emerald-600"
                          : "text-ink-faint hover:text-ink"
                      }`}
                      title={kw.savedToGlossary ? "Saved in Glossary" : "Save to Glossary"}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-light leading-relaxed">
                    {kw.definition}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
