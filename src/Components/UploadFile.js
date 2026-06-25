import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setToast } from "@/Store/Slices/Publishers";
import { FileUpload } from "@/Helpers/FileUpload";
import { nanoid } from "nanoid";
import Icon from "./Icon";
import Spinner from "./Spinner";
import Overlay from "./Overlay";

export default function UploadFile({
  kind = "image/*,video/*,audio/*",
  setImageURL,
  setImetas = null,
  setIsUploadsLoading = () => null,
}) {
  const inputID = nanoid();
  const userKeys = useSelector((state) => state.userKeys);
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pastedImgURL, setPastedImgURL] = useState(false);
  const [pastedImgFile, setPastedImgFile] = useState(false);

  const upload = async (files) => {
    if (!files || files.length === 0) return;
    setIsLoading(true);
    setIsUploadsLoading(true);

    const urls = [];
    const imetas = [];

    for (const file of Array.from(files)) {
      const result = await FileUpload({
        file,
        userKeys,
        cb: setProgress,
        includeImeta: true,
      });
      if (result) {
        urls.push(result.url);
        if (result.imeta) imetas.push(result.imeta);
      } else {
        dispatch(setToast({ type: 2, desc: "File upload failed." }));
      }
    }

    if (urls.length > 0) {
      setImageURL(urls.join(" "));
      if (setImetas && imetas.length > 0) setImetas(imetas);
    }

    setIsLoading(false);
    setIsUploadsLoading(false);
    setProgress(0);
  };

  const handleChange = (e) => upload(e.target.files);

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          const reader = new FileReader();
          reader.onload = (ev) => {
            setPastedImgFile(file);
            setPastedImgURL(ev.target.result);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  const handlePastedImage = (confirm) => {
    if (confirm) upload([pastedImgFile]);
    setPastedImgFile(false);
    setPastedImgURL(false);
  };

  return (
    <>
      {pastedImgURL && (
        <Overlay exit={() => handlePastedImage(false)} width={550}>
          <div
            style={{
              aspectRatio: "16/9",
              backgroundImage: `url(${pastedImgURL})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            className="fit-container"
          />
          <div className="box-pad-h-m box-pad-v-m fx-centered">
            <button
              className="btn btn-gst btn-full"
              onClick={() => handlePastedImage(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-normal btn-full"
              onClick={() => handlePastedImage(true)}
            >
              Upload
            </button>
          </div>
        </Overlay>
      )}
      <label
        htmlFor={inputID}
        className="pointer fx-centered"
        style={{ pointerEvents: isLoading ? "none" : "auto", cursor: "pointer" }}
      >
        <input
          type="file"
          id={inputID}
          multiple
          accept={kind}
          onChange={handleChange}
          disabled={isLoading}
          style={{ position: "absolute", opacity: 0, zIndex: -1, pointerEvents: "none" }}
        />
        {isLoading ? (
          <div className="fx-centered" style={{ gap: "4px" }}>
            <Spinner size={18} />
            {progress > 0 && progress < 100 && (
              <span className="gray-c p-medium" style={{ fontSize: "0.7rem" }}>
                {progress}%
              </span>
            )}
          </div>
        ) : (
          <Icon v={2} name="image_01" opacity=".5" size={24} />
        )}
      </label>
    </>
  );
}
