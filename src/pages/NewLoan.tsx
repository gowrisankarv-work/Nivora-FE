import { useEffect, useMemo, useState } from "react";
import { Form, Select, InputNumber, DatePicker, Button, Card, Row, Col, Table, message, Switch, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api, apiErrorCode } from "@/api/client";
import type { Customer, PageResponse, ScheduleResult } from "@/api/types";
import { formatInr } from "@/utils/format";
import { PenaltyConfigForm } from "@/components/PenaltyConfigForm";

const METHODS = ["FLAT", "REDUCING_BALANCE", "INTEREST_ONLY", "COMPOUND", "CUSTOM_SCHEDULE"];

export default function NewLoan() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form] = Form.useForm();
  const [preview, setPreview] = useState<ScheduleResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const values = Form.useWatch([], form);

  const { data: customers } = useQuery({
    queryKey: ["customers-select"],
    queryFn: async () => (await api.get<PageResponse<Customer>>("/customers", { params: { size: 200 } })).data.content,
  });

  const buildRequest = (v: Record<string, unknown>) => ({
    customerId: v.customerId,
    principal: v.principal,
    method: v.method,
    ratePercent: v.ratePercent,
    rateBasis: v.rateBasis,
    frequency: v.frequency,
    tenureValue: v.tenureValue,
    tenureUnit: v.tenureUnit,
    startDate: v.startDate ? dayjs(v.startDate as any).format("YYYY-MM-DD") : undefined,
    firstDueDate: v.firstDueDate ? dayjs(v.firstDueDate as any).format("YYYY-MM-DD") : undefined,
    compoundingPeriod: v.compoundingPeriod,
    repaymentOption: v.repaymentOption,
    scheduleRule: { skipSunday: v.skipSunday, dayOfMonth: v.dayOfMonth },
    penaltyOverride: v.penalty,
    notes: v.notes,
  });

  useEffect(() => {
    const v = values as Record<string, unknown> | undefined;
    if (!v?.principal || !v?.method || !v?.frequency || !v?.tenureValue) {
      setPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.post("/loans/preview", buildRequest(v));
        setPreview(res.data.schedule);
        setPreviewError(null);
      } catch (e) {
        setPreview(null);
        setPreviewError(t(`errors.${apiErrorCode(e)}`));
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values)]);

  const createMutation = useMutation({
    mutationFn: async (v: Record<string, unknown>) => (await api.post("/loans", buildRequest(v))).data,
    onSuccess: (loan) => {
      message.success(t("common.save"));
      navigate(`/loans/${loan.id}`);
    },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const method = values?.method as string | undefined;

  const scheduleColumns = [
    { title: "#", dataIndex: "seq" },
    { title: t("loans.dueDate"), dataIndex: "dueDate" },
    { title: t("loans.principalPart"), dataIndex: "principal", render: formatInr },
    { title: t("loans.interestPart"), dataIndex: "interest", render: formatInr },
    { title: t("common.amount"), dataIndex: "amount", render: formatInr },
    { title: t("dues.balance"), dataIndex: "balanceAfter", render: formatInr },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t("loans.newLoan")}</h1>
          <p>{t("app.tagline")}</p>
        </div>
      </div>
      <Row gutter={16}>
      <Col xs={24} lg={14}>
        <Card>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              customerId: params.get("customerId") || undefined,
              rateBasis: "PER_ANNUM", frequency: "MONTHLY", tenureUnit: "MONTHS",
              startDate: dayjs(), firstDueDate: dayjs().add(1, "month"), skipSunday: false,
              penalty: { type: "NONE", value: 0, graceDays: 0, waivable: true },
            }}
            onFinish={(v) => createMutation.mutate(v)}
          >
            <Form.Item name="customerId" label={t("dues.customer")} rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="label" options={customers?.map((c) => ({ value: c.id, label: `${c.customerNo} - ${c.name}` }))} />
            </Form.Item>
            <Row gutter={8}>
              <Col span={12}><Form.Item name="principal" label={t("loans.principal")} rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} min={1} /></Form.Item></Col>
              <Col span={12}>
                <Form.Item name="method" label={t("loans.method")} rules={[{ required: true }]}>
                  <Select options={METHODS.map((m) => ({ value: m, label: t(`loans.${camel(m)}`) }))} />
                </Form.Item>
              </Col>
            </Row>
            {method !== "CUSTOM_SCHEDULE" && (
              <Row gutter={8}>
                <Col span={12}><Form.Item name="ratePercent" label={t("loans.rate")} rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item></Col>
                <Col span={12}>
                  <Form.Item name="rateBasis" label={t("loans.rateBasis")}>
                    <Select options={[{ value: "PER_ANNUM", label: t("loans.perAnnum") }, { value: "PER_MONTH", label: t("loans.perMonth") }]} />
                  </Form.Item>
                </Col>
              </Row>
            )}
            <Row gutter={8}>
              <Col span={8}>
                <Form.Item name="frequency" label={t("loans.frequency")}>
                  <Select options={["DAILY", "WEEKLY", "MONTHLY"].map((f) => ({ value: f, label: t(`loans.${f.toLowerCase()}`) }))} />
                </Form.Item>
              </Col>
              <Col span={8}><Form.Item name="tenureValue" label={t("loans.tenure")} rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} min={1} /></Form.Item></Col>
              <Col span={8}>
                <Form.Item name="tenureUnit" label={t("loans.tenureUnit")}>
                  <Select options={["DAYS", "WEEKS", "MONTHS", "YEARS"].map((u) => ({ value: u, label: t(`loans.${u.toLowerCase()}`) }))} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={8}>
              <Col span={12}><Form.Item name="startDate" label={t("loans.startDate")}><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
              <Col span={12}><Form.Item name="firstDueDate" label={t("loans.firstDueDate")}><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
            </Row>
            {method === "COMPOUND" && (
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="compoundingPeriod" label={t("loans.compoundingPeriod")}>
                    <Select options={["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"].map((p) => ({ value: p, label: p }))} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="repaymentOption" label={t("loans.repaymentOption")}>
                    <Select options={[{ value: "BULLET", label: t("loans.bullet") }, { value: "EQUAL", label: t("loans.equal") }]} />
                  </Form.Item>
                </Col>
              </Row>
            )}
            {values?.frequency === "DAILY" && (
              <Space><Switch checked={values?.skipSunday} onChange={(v) => form.setFieldValue("skipSunday", v)} /> {t("loans.skipSunday")}</Space>
            )}
            {values?.frequency === "MONTHLY" && (
              <Form.Item name="dayOfMonth" label={t("loans.dayOfMonth")}><InputNumber style={{ width: "100%" }} min={1} max={31} /></Form.Item>
            )}
            <Form.Item label={t("loans.penaltyOverride")} name="penalty">
              <PenaltyConfigForm />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={createMutation.isPending} disabled={!preview}>
              {t("loans.createLoan")}
            </Button>
          </Form>
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Card title={t("loans.preview")}>
          {previewError && <Typography.Text type="danger">{previewError}</Typography.Text>}
          {preview && (
            <>
              <Row gutter={8}>
                <Col span={12}><Typography.Text type="secondary">{t("loans.instalmentAmount")}</Typography.Text><div><b>{formatInr(preview.instalmentAmount)}</b></div></Col>
                <Col span={12}><Typography.Text type="secondary">{t("loans.instalmentCount")}</Typography.Text><div><b>{preview.instalmentCount}</b></div></Col>
                <Col span={12}><Typography.Text type="secondary">{t("loans.totalInterest")}</Typography.Text><div><b>{formatInr(preview.totalInterest)}</b></div></Col>
                <Col span={12}><Typography.Text type="secondary">{t("loans.totalPayable")}</Typography.Text><div><b>{formatInr(preview.totalPayable)}</b></div></Col>
              </Row>
              <Table
                style={{ marginTop: 16 }}
                size="small"
                rowKey="seq"
                columns={scheduleColumns}
                dataSource={preview.rows}
                pagination={{ pageSize: 10 }}
                scroll={{ x: true }}
              />
            </>
          )}
          {!preview && !previewError && <Typography.Text type="secondary">Fill the form to see a live preview.</Typography.Text>}
        </Card>
      </Col>
      </Row>
    </div>
  );
}

function camel(upperSnake: string) {
  return upperSnake.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
