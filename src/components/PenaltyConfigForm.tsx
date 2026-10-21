import { Select, InputNumber, Switch, Space, Row, Col } from "antd";
import { useTranslation } from "react-i18next";
import type { PenaltyConfig, PenaltyType } from "@/api/types";

/** Shared with any other page that needs to display (not edit) a penalty type - e.g. LoanDetail. */
export const PENALTY_TYPE_LABEL_KEY: Record<PenaltyType, string> = {
  NONE: "none", FIXED_ONE_TIME: "fixedOneTime", FIXED_PER_DAY: "fixedPerDay",
  PERCENT_ONE_TIME: "percentOneTime", PERCENT_PER_DAY: "percentPerDay", PENAL_INTEREST_PA: "penalInterestPa",
};

/**
 * Same penalty configuration shape reused at tenant, customer and loan level (PEN-1).
 * Works as an Ant Design controlled sub-form: Form.Item passes `value` / `onChange`.
 */
export function PenaltyConfigForm({ value, onChange }: { value?: PenaltyConfig; onChange?: (v: PenaltyConfig) => void }) {
  const { t } = useTranslation();
  const current: PenaltyConfig = value || { type: "NONE", value: 0, graceDays: 0, waivable: true };

  const update = (patch: Partial<PenaltyConfig>) => onChange?.({ ...current, ...patch });

  const types: PenaltyType[] = ["NONE", "FIXED_ONE_TIME", "FIXED_PER_DAY", "PERCENT_ONE_TIME", "PERCENT_PER_DAY", "PENAL_INTEREST_PA"];

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Select
        value={current.type}
        style={{ width: "100%" }}
        onChange={(v) => update({ type: v })}
        options={types.map((ty) => ({ value: ty, label: t(`penalty.${PENALTY_TYPE_LABEL_KEY[ty]}`) }))}
      />
      {current.type !== "NONE" && (
        <>
          <Row gutter={8}>
            <Col span={12}>
              <InputNumber
                style={{ width: "100%" }}
                addonBefore={current.type.startsWith("PERCENT") || current.type === "PENAL_INTEREST_PA" ? "%" : "₹"}
                value={current.value}
                onChange={(v) => update({ value: v || 0 })}
              />
            </Col>
            <Col span={12}>
              <InputNumber style={{ width: "100%" }} addonBefore={t("calculator.graceDays")} value={current.graceDays} onChange={(v) => update({ graceDays: v || 0 })} />
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={12}>
              <InputNumber style={{ width: "100%" }} placeholder={t("penalty.capAmount")} value={current.capAmount ?? undefined} onChange={(v) => update({ capAmount: v ?? null })} />
            </Col>
            <Col span={12}>
              <InputNumber style={{ width: "100%" }} placeholder={t("penalty.capPercent")} value={current.capPercent ?? undefined} onChange={(v) => update({ capPercent: v ?? null })} />
            </Col>
          </Row>
          <Space>
            <Switch checked={current.waivable} onChange={(v) => update({ waivable: v })} />
            <span>{t("penalty.waivable")}</span>
          </Space>
        </>
      )}
    </Space>
  );
}
