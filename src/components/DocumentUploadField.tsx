import { useRef } from "react";
import { Button, message, Space } from "antd";
import { UploadOutlined, FileDoneOutlined, EyeOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const MAX_SIZE_BYTES = 8 * 1024 * 1024;

interface DocumentUploadFieldProps {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  existingUrl?: string | null;
  required?: boolean;
  /** When true (edit mode, optional document like a photo), shows a "remove" action that clears the existing file with no replacement. */
  allowRemoveExisting?: boolean;
  onRemoveExisting?: () => void;
  removed?: boolean;
}

/** Shared photo/ID-proof document picker: validates pdf/png/jpg/jpeg + 8MB, and on edit shows the current file via a presigned URL. */
export function DocumentUploadField({ label, file, onChange, existingUrl, required, allowRemoveExisting, onRemoveExisting, removed }: DocumentUploadFieldProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      message.error(t("customers.fileTypeInvalid"));
      return;
    }
    if (selected.size > MAX_SIZE_BYTES) {
      message.error(t("customers.fileTooLarge"));
      return;
    }
    onChange(selected);
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 14, marginBottom: 8 }}>
        {label} {required && <span style={{ color: "var(--c-danger)" }}>*</span>}
      </div>
      <Space wrap>
        <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: "none" }} onChange={handleSelect} />
        <Button icon={<UploadOutlined />} onClick={() => inputRef.current?.click()}>
          {file ? t("customers.changeFile") : t("customers.chooseFile")}
        </Button>
        {file && (
          <Space size={4}>
            <FileDoneOutlined style={{ color: "var(--c-primary)" }} />
            <span style={{ fontSize: 13 }}>{file.name}</span>
          </Space>
        )}
        {!file && existingUrl && !removed && (
          <Space size={4}>
            <Button type="link" icon={<EyeOutlined />} href={existingUrl} target="_blank" rel="noreferrer" style={{ padding: 0 }}>
              {t("customers.viewCurrent")}
            </Button>
            {allowRemoveExisting && (
              <Button type="text" danger icon={<CloseCircleOutlined />} onClick={onRemoveExisting} style={{ padding: 0 }} />
            )}
          </Space>
        )}
        {!file && removed && <span style={{ fontSize: 13, color: "var(--c-text-faint)" }}>{t("customers.willBeRemoved")}</span>}
      </Space>
    </div>
  );
}
