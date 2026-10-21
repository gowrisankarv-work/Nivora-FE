import { useParams, useNavigate } from "react-router-dom";
import { Card, Table, Button, Space, Modal, Form, Select, DatePicker, InputNumber, message, Tag, Descriptions, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import dayjs from "dayjs";
import { api, apiErrorCode } from "@/api/client";
import type { ChitGroup, Customer, PageResponse } from "@/api/types";
import { formatInr } from "@/utils/format";

export default function ChitGroupDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [auctionOpen, setAuctionOpen] = useState(false);
  const [auctionPreview, setAuctionPreview] = useState<Record<string, number> | null>(null);

  const { data: group } = useQuery({ queryKey: ["chit-group", id], queryFn: async () => (await api.get<ChitGroup>(`/chit-groups/${id}`)).data });
  const { data: customers } = useQuery({
    queryKey: ["customers-select"],
    queryFn: async () => (await api.get<PageResponse<Customer>>("/customers", { params: { size: 200 } })).data.content,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (customerId: string) => api.post(`/chit-groups/${id}/members`, { customerId }),
    onSuccess: () => { message.success(t("common.save")); setAddMemberOpen(false); queryClient.invalidateQueries({ queryKey: ["chit-group", id] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const postAuctionMutation = useMutation({
    mutationFn: async (v: Record<string, unknown>) =>
      api.post(`/chit-groups/${id}/auctions/${v.period}`, {
        auctionDate: dayjs(v.auctionDate as any).format("YYYY-MM-DD"),
        winnerMemberNo: v.winnerMemberNo, discountAmount: v.discountAmount,
      }),
    onSuccess: () => { message.success(t("common.save")); setAuctionOpen(false); queryClient.invalidateQueries({ queryKey: ["chit-group", id] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const undoMutation = useMutation({
    mutationFn: async (period: number) => api.delete(`/chit-groups/${id}/auctions/${period}`),
    onSuccess: () => { message.success(t("common.save")); queryClient.invalidateQueries({ queryKey: ["chit-group", id] }); },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  if (!group) return null;

  const nextPeriod = group.auctions.length + 1;
  const unprizedMembers = group.members.filter((m) => !m.prizedPeriod);

  const previewAuction = async (discountAmount: number, winnerMemberNo: number) => {
    if (!discountAmount) return;
    try {
      const res = await api.post("/calculator/chit", {
        chitValue: group.chitValueAmount, memberCount: group.memberCount, commissionPercent: group.commissionPercent,
        discountAmount, postPrizeRule: group.postPrizeRule, unprizedMemberCount: unprizedMembers.length - 1,
      });
      setAuctionPreview(res.data);
    } catch { /* ignore */ }
  };

  const memberColumns = [
    { title: "#", dataIndex: "memberNo" },
    { title: t("dues.customer"), render: (_: unknown, m: any) => customers?.find((c) => c.id === m.customerId)?.name || m.customerId },
    { title: t("common.status"), render: (_: unknown, m: any) => <Tag color={m.prizedPeriod ? "gold" : "default"}>{m.prizedPeriod ? `${t("chit.prized")} (${t("chit.period")} ${m.prizedPeriod})` : t("chit.unprized")}</Tag> },
  ];

  const auctionColumns = [
    { title: t("chit.period"), dataIndex: "period" },
    { title: t("chit.auctionDate"), dataIndex: "auctionDate" },
    { title: t("chit.winner"), dataIndex: "winnerMemberNo" },
    { title: t("chit.discount"), dataIndex: "discountAmount", render: formatInr },
    { title: t("chit.prize"), dataIndex: "prizeAmount", render: formatInr },
    {
      title: t("common.actions"),
      render: (_: unknown, a: any) => <Button size="small" danger onClick={() => undoMutation.mutate(a.period)}>{t("chit.undoAuction")}</Button>,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Space align="center" size={14}>
          <Button type="text" shape="circle" className="icon-btn" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
          <div>
            <h1 style={{ marginBottom: 0 }}>{group.name}</h1>
            <p>{group.groupNo}</p>
          </div>
        </Space>
        <Space>
          <Button onClick={() => setAddMemberOpen(true)} disabled={group.members.length >= group.memberCount}>{t("chit.addMember")}</Button>
          <Button type="primary" onClick={() => setAuctionOpen(true)} disabled={unprizedMembers.length === 0}>{t("chit.postAuction")}</Button>
        </Space>
      </div>
      <Card>
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label={t("chit.chitValue")}>{formatInr(group.chitValueAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("chit.subscription")}>{formatInr(group.subscriptionAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("chit.commissionPercent")}>{group.commissionPercent}%</Descriptions.Item>
          <Descriptions.Item label={t("chit.postPrizeRule")}>{t(`chit.${group.postPrizeRule === "SAME_AS_OTHERS" ? "sameAsOthers" : "fullSubscription"}`)}</Descriptions.Item>
        </Descriptions>
        <Typography.Title level={5} style={{ marginTop: 16 }}>{t("chit.members")}</Typography.Title>
        <Table rowKey="memberNo" columns={memberColumns} dataSource={group.members} pagination={false} size="small" />
        <Typography.Title level={5} style={{ marginTop: 16 }}>{t("chit.postAuction")}</Typography.Title>
        <Table rowKey="period" columns={auctionColumns} dataSource={group.auctions} pagination={false} size="small" />
      </Card>

      <Modal title={t("chit.addMember")} open={addMemberOpen} onCancel={() => setAddMemberOpen(false)} footer={null}>
        <Form layout="vertical" onFinish={(v) => addMemberMutation.mutate(v.customerId)}>
          <Form.Item name="customerId" label={t("dues.customer")} rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={customers?.map((c) => ({ value: c.id, label: `${c.customerNo} - ${c.name}` }))} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={addMemberMutation.isPending}>{t("common.save")}</Button>
        </Form>
      </Modal>

      <Modal title={`${t("chit.postAuction")} - ${t("chit.period")} ${nextPeriod}`} open={auctionOpen} onCancel={() => setAuctionOpen(false)} footer={null}>
        <Form layout="vertical" initialValues={{ period: nextPeriod, auctionDate: dayjs() }} onFinish={(v) => postAuctionMutation.mutate({ ...v, period: nextPeriod })}>
          <Form.Item name="auctionDate" label={t("chit.auctionDate")} rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="winnerMemberNo" label={t("chit.winner")} rules={[{ required: true }]}>
            <Select
              options={unprizedMembers.map((m) => ({ value: m.memberNo, label: `#${m.memberNo} ${customers?.find((c) => c.id === m.customerId)?.name || ""}` }))}
              onChange={(v) => previewAuction(0, v)}
            />
          </Form.Item>
          <Form.Item name="discountAmount" label={t("chit.discount")} rules={[{ required: true }]}>
            <InputNumber style={{ width: "100%" }} onChange={(v) => previewAuction(Number(v) || 0, 0)} />
          </Form.Item>
          {auctionPreview && (
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t("chit.commission")}>{formatInr(auctionPreview.commission)}</Descriptions.Item>
              <Descriptions.Item label={t("chit.dividendPool")}>{formatInr(auctionPreview.dividendPool)}</Descriptions.Item>
              <Descriptions.Item label={t("chit.dividendPerMember")}>{formatInr(auctionPreview.dividendPerMember)}</Descriptions.Item>
              <Descriptions.Item label={t("chit.netInstalment")}>{formatInr(auctionPreview.netInstalmentNonPrized)}</Descriptions.Item>
              <Descriptions.Item label={t("chit.prize")}>{formatInr(auctionPreview.prizeToWinner)}</Descriptions.Item>
            </Descriptions>
          )}
          <Button type="primary" htmlType="submit" block loading={postAuctionMutation.isPending}>{t("common.confirm")}</Button>
        </Form>
      </Modal>
    </div>
  );
}
