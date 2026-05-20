import { useState, useRef, useEffect } from "react";

/**
 * Watches a Tiptap editor and returns the last edited top-level node
 * with surrounding context, debounced by debounceMs.
 *
 * @param {object|null} editor - Tiptap editor instance
 * @param {number} debounceMs
 * @returns {{ index: number, text: string, before: string, after: string } | null}
 */
export default function useLastEditedParagraph(editor, debounceMs = 9000) {
  const [lastEdited, setLastEdited] = useState(null);
  const timerRef = useRef(null);
  const lastIndexRef = useRef(-1);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const { state } = editor;
      const { selection, doc } = state;

      // Find which top-level node the cursor sits in
      let foundIndex = -1;
      let foundText = "";
      let beforeText = "";
      let afterText = "";

      doc.forEach((node, offset, index) => {
        const nodeStart = offset;
        const nodeEnd = offset + node.nodeSize;
        if (
          selection.from >= nodeStart &&
          selection.from <= nodeEnd &&
          foundIndex === -1
        ) {
          foundIndex = index;
          foundText = node.textContent;

          // Collect surrounding context
          const texts = [];
          doc.forEach((n) => texts.push(n.textContent));
          beforeText = texts.slice(Math.max(0, index - 2), index).join("\n\n");
          afterText = texts.slice(index + 1, index + 3).join("\n\n");
        }
      });

      if (foundIndex === -1 || !foundText.trim()) return;

      // If cursor moved to a different paragraph, reset the debounce timer
      if (foundIndex !== lastIndexRef.current) {
        clearTimeout(timerRef.current);
        lastIndexRef.current = foundIndex;
      }

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setLastEdited({
          index: foundIndex,
          text: foundText,
          before: beforeText,
          after: afterText,
        });
      }, debounceMs);
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
      clearTimeout(timerRef.current);
    };
  }, [editor, debounceMs]);

  return lastEdited;
}
