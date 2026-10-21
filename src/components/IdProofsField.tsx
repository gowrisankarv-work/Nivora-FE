import { Button, Input, Space } from "antd";
import { CloseCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { IdProofType } from "@/api/types";
import { DocumentUploadField } from "./DocumentUploadField";

export interface IdProofEntryDraft {
  type: IdProofType;
  otherTypeName?: string;
  number?: string;
  file: File | null;
  existingUrl?: string;
}

const ADDABLE_TYPES: IdProofType[] = ["PAN", "RATION", "OTHER"];

interface IdProofsFieldProps {
  entries: IdProofEntryDraft[];
  onChange: (entries: IdProofEntryDraft[]) => void;
}

/** Aadhaar (number + document) is always required; PAN/Ration/Other can be added as extra proofs. */
export function IdProofsField({ entries, onChange }: IdProofsFieldProps) {
  const { t } = useTranslation();

  const typeLabel = (type: IdProofType) =>
    t(`customers.idProof${type.charAt(0) + type.slice(1).toLowerCase()}`);

  const updateEntry = (type: IdProofType, patch: Partial<IdProofEntryDraft>) => {
    onChange(entries.map((e) => (e.type === type ? { ...e, ...patch } : e)));
  };
  const removeEntry = (type: IdProofType) => {
    onChange(entries.filter((e) => e.type !== type));
  };
  const addEntry = (type: IdProofType) => {
    onChange([...entries, { type, file: null }]);
  };

  const addableTypes = ADDABLE_TYPES.filter((type) => !entries.some((e) => e.type === type));

  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 13.5, margin: "16px 0 8px" }}>{t("customers.idProofs")}</div>
      {entries.map((entry) => (
        <div key={entry.type} style={{ border: "1px solid var(--c-border)", borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <strong style={{ fontSize: 13.5 }}>
              {typeLabel(entry.type)}
              {entry.type === "AADHAAR" && <span style={{ color: "var(--c-danger)" }}> *</span>}
            </strong>
            {entry.type !== "AADHAAR" && (
              <Button type="text" danger size="small" icon={<CloseCircleOutlined />} onClick={() => removeEntry(entry.type)} />
            )}
          </div>
          {entry.type === "OTHER" && (
            <Input
              placeholder={t("customers.idProofOtherName")}
              value={entry.otherTypeName}
              onChange={(e) => updateEntry(entry.type, { otherTypeName: e.target.value })}
              style={{ marginBottom: 10 }}
            />
          )}
          <Input
            placeholder={t("customers.idProofNumber")}
            value={entry.number}
            onChange={(e) => updateEntry(entry.type, { number: e.target.value })}
            style={{ marginBottom: 10 }}
            maxLength={entry.type === "AADHAAR" ? 12 : undefined}
          />
          <DocumentUploadField
            label={t("customers.idProofDocument")}
            file={entry.file}
            onChange={(f) => updateEntry(entry.type, { file: f })}
            existingUrl={entry.existingUrl}
            required={entry.type === "AADHAAR"}
          />
        </div>
      ))}
      {addableTypes.length > 0 && (
        <Space wrap style={{ marginBottom: 16 }}>
          {addableTypes.map((type) => (
            <Button key={type} size="small" icon={<PlusOutlined />} onClick={() => addEntry(type)}>
              {typeLabel(type)}
            </Button>
          ))}
        </Space>
      )}
    </div>
  );
}
