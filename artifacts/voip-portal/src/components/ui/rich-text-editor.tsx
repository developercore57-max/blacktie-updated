import { useRef, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
import { Bold, Italic, Underline, List, ListOrdered, Minus } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

function ToolbarButton({
  onMouseDown,
  title,
  children,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={onMouseDown}
      className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-foreground/70 hover:text-foreground transition-colors"
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter description…",
  minHeight = "120px",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    const safe = DOMPurify.sanitize(value ?? "");
    if (el.innerHTML !== safe) {
      el.innerHTML = safe;
    }
  }, [value]);

  const exec = useCallback((command: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    isInternalChange.current = true;
    onChange(editorRef.current?.innerHTML ?? "");
  }, [onChange]);

  const handleInput = useCallback(() => {
    isInternalChange.current = true;
    onChange(editorRef.current?.innerHTML ?? "");
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      exec("insertText", "    ");
    }
  }, [exec]);

  const isEmpty = !value || value === "" || value === "<br>" || value === "<div><br></div>";

  return (
    <div className="rounded-xl border border-border overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30">
        <ToolbarButton title="Bold" onMouseDown={(e) => { e.preventDefault(); exec("bold"); }}>
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Italic" onMouseDown={(e) => { e.preventDefault(); exec("italic"); }}>
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Underline" onMouseDown={(e) => { e.preventDefault(); exec("underline"); }}>
          <Underline className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton title="Bullet list" onMouseDown={(e) => { e.preventDefault(); exec("insertUnorderedList"); }}>
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" onMouseDown={(e) => { e.preventDefault(); exec("insertOrderedList"); }}>
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton title="Horizontal rule" onMouseDown={(e) => { e.preventDefault(); exec("insertHorizontalRule"); }}>
          <Minus className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton title="Remove formatting" onMouseDown={(e) => { e.preventDefault(); exec("removeFormat"); }}>
          <span className="text-[11px] font-semibold leading-none">T×</span>
        </ToolbarButton>
      </div>

      {/* Editable area */}
      <div className="relative">
        {isEmpty && (
          <span
            className="absolute top-0 left-0 px-4 py-2.5 text-sm text-muted-foreground/50 pointer-events-none select-none"
            aria-hidden="true"
          >
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          style={{ minHeight }}
          className="px-4 py-2.5 text-sm text-foreground focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_hr]:border-border [&_hr]:my-2"
        />
      </div>
    </div>
  );
}
