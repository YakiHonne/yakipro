import React, { useState, useEffect } from "react";
import { SelectTabs } from "@/Components/SelectTabs";
import NoteEditor from "./NoteEditor";
import ArticleEditorV2 from "./ArticleEditorV2";
import { getSubData } from "@/Helpers/Helpers";

export default function CreateContent() {
  const [activeSection, setActiveSection] = useState(0);
  // const fetchNotes = async () => {
  //   const data = await getSubData({
  //     filter: [
  //       {
  //         kinds: [1],
  //         authors: [
  //           "28313968021dd85505275f2edf55d8feb071a88adec61a06d34923b57e036f8d",
  //         ],
  //       },
  //     ],
  //     relayUrls: ["wss://premium.yakihonne.com", "wss://pyramid.fiatjaf.com"],
  //     cacheUsage: "ONLY_RELAY",
  //   });
  //   console.log(data);
  // };
  // useEffect(() => {
  //   fetchNotes();
  // }, []);
  return (
    <div
      className="fit-container box-pad-h-m box-pad-v-m fx-col no-scrollbar"
      style={{ height: "100dvh", overflow: "scroll", gap: "1.5rem" }}
    >

      <div className="fx-centered">
        <div>
          <SelectTabs
            tabs={["Notes", "Articles"]}
            selectedTab={activeSection}
            setSelectedTab={setActiveSection}
          />
        </div>
      </div>

      {activeSection === 0 && <NoteEditor />}
      {activeSection === 1 && <ArticleEditorV2 />}
    </div>
  );
}
