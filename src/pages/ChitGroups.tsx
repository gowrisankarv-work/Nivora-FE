import { useState } from "react";
import { Table, Button, Drawer, Form, Input, InputNumber, DatePicker, Select, message, Tag, Card, Alert, Empty } from "antd";
import { PlusOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api, apiErrorCode } from "@/api/client";
import type { ChitGroup, PageResponse } from "@/api/types";
import { formatInr } from "@/utils/format";
import { PenaltyConfigForm } from "@/components/PenaltyConfigForm";

export default function ChitGroups() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["chit-groups"],
    queryFn: async () => (await api.get<PageResponse<ChitGroup>>("/chit-groups", { params: { size: 100 } })).data,
  });

  const createMutation = useMutation({
    mutationFn: async (v: Record<string, unknown>) =>
      api.post("/chit-groups", { ...v, startDate: dayjs(v.startDate as any).format("YYYY-MM-DD") }),
    onSuccess: () => { message.success(t("common.save")); setOpen(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ["chit-groups"] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const columns = [
    { title: t("chit.groupNo"), dataIndex: "groupNo", render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: t("chit.groupName"), dataIndex: "name" },
    { title: t("chit.chitValue"), dataIndex: "chitValueAmount", render: formatInr },
    { title: t("chit.memberCount"), render: (_: unknown, g: ChitGroup) => `${g.members.length} / ${g.memberCount}` },
    { title: t("common.status"), dataIndex: "status", render: (s: string) => <Tag color={s === "ACTIVE" ? "success" : "default"}>{s}</Tag> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t("chit.title")}</h1>
          <p>{data ? `${data.totalElements} ${t("chit.title").toLowerCase()}` : ""}</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)} size="large">{t("chit.newGroup")}</Button>
      </div>

      <Alert type="info" icon={<InfoCircleOutlined />} showIcon message={t("chit.regulatoryNote")} style={{ marginBottom: 16, borderRadius: 10 }} />

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data?.content}
          loading={isLoading}
          onRow={(g) => ({ onClick: () => navigate(`/chit-groups/${g.id}`), style: { cursor: "pointer" } })}
          pagination={{ style: { paddingInline: 20 } }}
          locale={{ emptyText: <Empty description={t("common.noData")} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 32 }} /> }}
        />
      </Card>

      <Drawer title={t("chit.newGroup")} open={open} onClose={() => setOpen(false)} width={420}>
        <Form form={form} layout="vertical" initialValues={{ frequency: "MONTHLY", postPrizeRule: "SAME_AS_OTHERS", maxDiscountPercent: 40 }} onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="name" label={t("chit.groupName")} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="chitValue" label={t("chit.chitValue")} rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="memberCount" label={t("chit.memberCount")} rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} min={2} /></Form.Item>
          <Form.Item name="frequency" label={t("loans.frequency")}>
            <Select options={["DAILY", "WEEKLY", "MONTHLY"].map((f) => ({ value: f, label: t(`loans.${f.toLowerCase()}`) }))} />
          </Form.Item>
          <Form.Item name="startDate" label={t("loans.startDate")} rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="commissionPercent" label={t("chit.commissionPercent")} rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="maxDiscountPercent" label={t("chit.maxDiscountPercent")}><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="postPrizeRule" label={t("chit.postPrizeRule")}>
            <Select options={[{ value: "SAME_AS_OTHERS", label: t("chit.sameAsOthers") }, { value: "FULL_SUBSCRIPTION", label: t("chit.fullSubscription") }]} />
          </Form.Item>
          <Form.Item name="penalty" label={t("loans.penaltyOverride")}>
            <PenaltyConfigForm />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={createMutation.isPending}>{t("common.save")}</Button>
        </Form>
      </Drawer>
    </div>
  );
}
