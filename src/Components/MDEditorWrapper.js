import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import katex from "katex";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "400px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <p className="gray-c">Loading editor...</p>
    </div>
  ),
});

export default function MDEditorWrapper({
  direction = "ltr",
  dataColorMode = "light",
  preview = "live",
  height = "80vh",
  width = "100%",
  value,
  onChange,
  execute,
}) {
  const [commands, setCommands] = useState(null);
  const [editorCommands, setEditorCommands] = useState(null);

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          const reader = new FileReader();
          reader.onload = async () => {
            const url = await execute(file);
            if (url) onChange(value ? `${value} ![image](${url})` : `![image](${url})`);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [value, execute, onChange]);

  useEffect(() => {
    const load = async () => {
      try {
        const mod = await import("@uiw/react-md-editor");
        const {
          commands,
          bold,
          italic,
          strikethrough,
          hr,
          link,
          quote,
          code,
          codeBlock,
          unorderedListCommand,
          orderedListCommand,
          checkedListCommand,
          comment,
          divider,
        } = mod;
        setCommands({ commands, bold, italic, strikethrough, hr, link, quote, code, codeBlock, unorderedListCommand, orderedListCommand, checkedListCommand, comment, divider });
      } catch (err) {
        console.error("[MDEditorWrapper] Failed to load commands:", err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!commands) return;
    const {
      bold, italic, strikethrough, hr, link, quote, code, codeBlock,
      unorderedListCommand, orderedListCommand, checkedListCommand, comment, divider,
    } = commands;

    const uploadCmd = commands.commands.group([], {
      name: "upload",
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M13 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22H15C20 22 22 20 22 15V10" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 8V2L20 4M18 2L16 4" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2.67 18.95L7.6 15.64C8.39 15.11 9.53 15.17 10.24 15.78L10.57 16.07C11.35 16.74 12.61 16.74 13.39 16.07L17.55 12.5C18.33 11.83 19.59 11.83 20.37 12.5L22 13.9" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      execute: async (state, api) => {
        if (!execute) return;
        const file = await execute();
        if (!file) return;
        if (/(\.gif|\.png|\.jpg|\.jpeg|\.webp|\.tiff)/i.test(file))
          api.replaceSelection(`![image](${file})`);
        else if (/(\.mp4|\.mov)/i.test(file))
          api.replaceSelection(`<video src="${file}" controls></video>`);
        else
          api.replaceSelection(file);
      },
      buttonProps: { "aria-label": "Upload file", title: "Upload file" },
    });

    const mathCmd = commands.commands.group([], {
      name: "math",
      icon: <span style={{ fontSize: "10px", fontWeight: "bold" }}>ƒ</span>,
      execute: (state, api) => {
        api.replaceSelection(
          state.selectedText ? `\`$$${state.selectedText}$$\`` : "`$$f(x)$$`",
        );
      },
      buttonProps: { "aria-label": "Insert math", title: "Insert math" },
    });

    const customLink = {
      ...link,
      execute: (state, api) => {
        const isURL = state.selectedText?.startsWith("http");
        const mod = isURL
          ? `[Text here](${state.selectedText})`
          : `[${state.selectedText || "Text here"}](URL here)`;
        api.replaceSelection(mod);
      },
    };

    setEditorCommands([
      divider,
      bold, italic, strikethrough, hr,
      commands.commands.group(
        [commands.commands.title1, commands.commands.title2, commands.commands.title3, commands.commands.title4, commands.commands.title5, commands.commands.title6],
        { name: "title", groupName: "title", buttonProps: { "aria-label": "Insert title", title: "Insert title" } },
      ),
      customLink,
      quote, code, codeBlock,
      mathCmd,
      uploadCmd,
      comment,
      unorderedListCommand, orderedListCommand, checkedListCommand,
    ]);
  }, [commands, execute]);

  if (!commands || !editorCommands) return <div style={{ height: "400px" }} />;

  return (
    <MDEditor
      direction={direction}
      autoFocus
      data-color-mode={dataColorMode}
      preview={preview}
      height={height}
      width={width}
      value={value}
      onChange={onChange}
      commands={editorCommands}
      previewOptions={{
        components: {
          p: ({ children }) => <div style={{ marginBottom: "0.5rem" }}>{children}</div>,
          h1: ({ children }) => <h1 dir="auto">{children}</h1>,
          h2: ({ children }) => <h2 dir="auto">{children}</h2>,
          h3: ({ children }) => <h3 dir="auto">{children}</h3>,
          h4: ({ children }) => <h4 dir="auto">{children}</h4>,
          h5: ({ children }) => <h5 dir="auto">{children}</h5>,
          h6: ({ children }) => <h6 dir="auto">{children}</h6>,
          li: ({ children }) => <li dir="auto">{children}</li>,
          code: ({ inline, children, className }) => {
            if (!children) return null;
            const txt = children[0] || "";
            if (inline && typeof txt === "string" && /^\$\$(.*)\$\$/.test(txt)) {
              const html = katex.renderToString(txt.replace(/^\$\$(.*)\$\$/, "$1"), { throwOnError: false });
              return <code dangerouslySetInnerHTML={{ __html: html }} />;
            }
            if (inline) return <code dangerouslySetInnerHTML={{ __html: String(txt) }} />;
            if (typeof txt === "string" && typeof className === "string" && /^language-katex/i.test(className)) {
              const html = katex.renderToString(txt, { throwOnError: false });
              return <code dangerouslySetInnerHTML={{ __html: html }} />;
            }
            return <code className={String(className || "")}>{children}</code>;
          },
        },
      }}
    />
  );
}
