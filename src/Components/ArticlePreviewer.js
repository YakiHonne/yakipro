import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { Markdown } from "tiptap-markdown";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { all, createLowlight } from "lowlight";
import Mathematics from "tiptap-math";
import "katex/dist/katex.min.css";
import NostrEntityExtension from "@/Extensions/NostrEntityExtension";
import { useEffect } from "react";

const lowlight = createLowlight(all);

const EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4, 5, 6] },
    codeBlock: false,
  }),
  CodeBlockLowlight.configure({ lowlight }),
  Mathematics.configure({ evaluation: true }),
  NostrEntityExtension,
  Markdown.configure({
    html: false,
    linkify: true,
    transformPastedText: false,
    transformCopiedText: false,
  }),
  Image.configure({ inline: false, allowBase64: false }),
  Link.configure({
    openOnClick: true,
    HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
  }),
  Underline,
  Highlight.configure({ multicolor: false }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Superscript,
  Subscript,
];

export default function ArticlePreviewer({ content }) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: EXTENSIONS,
    editorProps: {
      attributes: { class: "tiptap-content", style: "padding: 0" },
    },
    content: "",
  });

  useEffect(() => {
    if (!editor || !content) return;
    editor.commands.setContent(content);
  }, [editor, content]);

  return <EditorContent editor={editor} />;
}
