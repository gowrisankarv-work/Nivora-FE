import { useState } from "react";
import { Tabs, Form, InputNumber, Select, DatePicker, Button, Card, Table, Row, Col, Typography, Descriptions } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { api } from "@/api/client";
import type { ScheduleResult } from "@/api/types";
import { formatInr } from "@/utils/format";
import { PenaltyConfigForm } from "@/components/PenaltyConfigForm";

export default function Calculator() {
  const { t } = useTranslation();
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t("calculator.title")}</h1>
          <p>{t("app.tagline")}</p>
        </div>
      </div>
      <Card>
      <Tabs
        items={[
          { key: "loan", label: t("calculator.loanTab"), children: <LoanCalc /> },
          { key: "penalty", label: t("calculator.penaltyTab"), children: <PenaltyCalc /> },
          // Chit calculator tab disabled - { key: "chit", label: t("calculator.chitTab"), children: <ChitCalc /> },
        ]}
      />
      </Card>
    </div>
  );
}

function LoanCalc() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [lastRequest, setLastRequest] = useState<Record<string, unknown> | null>(null);

  const onFinish = async (v: Record<string, unknown>) => {
    const req = {
      principal: v.principal, rate: v.rate, rateBasis: v.rateBasis,
      tenure: { value: v.tenureValue, unit: v.tenureUnit }, frequency: v.frequency, method: v.method,
      startDate: dayjs(v.startDate as any).format("YYYY-MM-DD"),
    };
    setLastRequest({ ...v, ...req });
    const res = await api.post<ScheduleResult>("/calculator/emi", req);
    setResult(res.data);
  };

  const createLoanFromThis = () => {
    if (!lastRequest) return;
    const params = new URLSearchParams();
    navigate(`/loans/new?${params.toString()}`);
  };

  return (
    <Row gutter={16}>
      <Col xs={24} md={12}>
        <Form layout="vertical" onFinish={onFinish} initialValues={{ rateBasis: "PER_ANNUM", frequency: "MONTHLY", tenureUnit: "MONTHS", method: "FLAT", startDate: dayjs() }}>
          <Form.Item name="principal" label={t("loans.principal")} rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Row gutter={8}>
            <Col span={12}><Form.Item name="rate" label={t("loans.rate")} rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="rateBasis" label={t("loans.rateBasis")}>
                <Select options={[{ value: "PER_ANNUM", label: t("loans.perAnnum") }, { value: "PER_MONTH", label: t("loans.perMonth") }]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={8}><Form.Item name="tenureValue" label={t("loans.tenure")} rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item></Col>
            <Col span={8}>
              <Form.Item name="tenureUnit" label={t("loans.tenureUnit")}>
                <Select options={["DAYS", "WEEKS", "MONTHS", "YEARS"].map((u) => ({ value: u, label: t(`loans.${u.toLowerCase()}`) }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="frequency" label={t("loans.frequency")}>
                <Select options={["DAILY", "WEEKLY", "MONTHLY"].map((f) => ({ value: f, label: t(`loans.${f.toLowerCase()}`) }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="method" label={t("loans.method")}>
            <Select options={["FLAT", "REDUCING_BALANCE", "INTEREST_ONLY", "COMPOUND"].map((m) => ({ value: m, label: m }))} />
          </Form.Item>
          <Form.Item name="startDate" label={t("loans.startDate")}><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Button type="primary" htmlType="submit" block>{t("common.submit")}</Button>
        </Form>
      </Col>
      <Col xs={24} md={12}>
        {result && (
          <>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label={t("loans.instalmentAmount")}>{formatInr(result.instalmentAmount)}</Descriptions.Item>
              <Descriptions.Item label={t("loans.instalmentCount")}>{result.instalmentCount}</Descriptions.Item>
              <Descriptions.Item label={t("loans.totalInterest")}>{formatInr(result.totalInterest)}</Descriptions.Item>
              <Descriptions.Item label={t("loans.totalPayable")}>{formatInr(result.totalPayable)}</Descriptions.Item>
            </Descriptions>
            <Button style={{ marginTop: 16 }} onClick={createLoanFromThis}>{t("calculator.createLoanFromThis")}</Button>
            <Table style={{ marginTop: 16 }} size="small" rowKey="seq" dataSource={result.rows} pagination={{ pageSize: 10 }}
              columns={[
                { title: "#", dataIndex: "seq" }, { title: t("loans.dueDate"), dataIndex: "dueDate" },
                { title: t("common.amount"), dataIndex: "amount", render: formatInr },
              ]} />
          </>
        )}
      </Col>
    </Row>
  );
}

function PenaltyCalc() {
  const { t } = useTranslation();
  const [result, setResult] = useState<number | null>(null);

  const onFinish = async (v: Record<string, unknown>) => {
    const res = await api.post<{ penaltyAmount: number }>("/calculator/penalty", { balance: v.balance, daysLate: v.daysLate, penalty: v.penalty });
    setResult(res.data.penaltyAmount);
  };

  return (
    <Row gutter={16}>
      <Col xs={24} md={12}>
        <Form layout="vertical" onFinish={onFinish} initialValues={{ penalty: { type: "PERCENT_PER_DAY", value: 0.1, graceDays: 0, waivable: true } }}>
          <Form.Item name="balance" label={t("calculator.balance")} rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="daysLate" label={t("calculator.daysLate")} rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="penalty" label={t("calculator.penaltyType")}><PenaltyConfigForm /></Form.Item>
          <Button type="primary" htmlType="submit" block>{t("common.submit")}</Button>
        </Form>
      </Col>
      <Col xs={24} md={12}>
        {result !== null && <Typography.Title level={3}>{formatInr(result)}</Typography.Title>}
      </Col>
    </Row>
  );
}

function ChitCalc() {
  const { t } = useTranslation();
  const [result, setResult] = useState<Record<string, number> | null>(null);

  const onFinish = async (v: Record<string, unknown>) => {
    const res = await api.post("/calculator/chit", v);
    setResult(res.data);
  };

  return (
    <Row gutter={16}>
      <Col xs={24} md={12}>
        <Form layout="vertical" onFinish={onFinish} initialValues={{ postPrizeRule: "SAME_AS_OTHERS" }}>
          <Form.Item name="chitValue" label={t("chit.chitValue")} rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="memberCount" label={t("chit.memberCount")} rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="commissionPercent" label={t("chit.commissionPercent")} rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="discountAmount" label={t("chit.discount")} rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="postPrizeRule" label={t("chit.postPrizeRule")}>
            <Select options={[{ value: "SAME_AS_OTHERS", label: t("chit.sameAsOthers") }, { value: "FULL_SUBSCRIPTION", label: t("chit.fullSubscription") }]} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>{t("common.submit")}</Button>
        </Form>
      </Col>
      <Col xs={24} md={12}>
        {result && (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label={t("chit.commission")}>{formatInr(result.commission)}</Descriptions.Item>
            <Descriptions.Item label={t("chit.dividendPool")}>{formatInr(result.dividendPool)}</Descriptions.Item>
            <Descriptions.Item label={t("chit.dividendPerMember")}>{formatInr(result.dividendPerMember)}</Descriptions.Item>
            <Descriptions.Item label={t("chit.netInstalment")}>{formatInr(result.netInstalmentNonPrized)}</Descriptions.Item>
            <Descriptions.Item label={t("chit.prize")}>{formatInr(result.prizeToWinner)}</Descriptions.Item>
          </Descriptions>
        )}
      </Col>
    </Row>
  );
}
