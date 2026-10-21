import { useEffect, useState } from "react";
import { Drawer, Form, Input, Button, Checkbox, Avatar, message } from "antd";
import { UserOutlined, PhoneOutlined, CameraOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiErrorCode } from "@/api/client";
import type { Guarantor } from "@/api/types";
import { AddressFields } from "./AddressFields";
import { IdProofsField, type IdProofEntryDraft } from "./IdProofsField";

interface GuarantorFormDrawerProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  guarantor?: Guarantor;
  onSaved: () => void;
}

export function GuarantorFormDrawer({ open, onClose, customerId, guarantor, onSaved }: GuarantorFormDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isEdit = !!guarantor;

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [idProofEntries, setIdProofEntries] = useState<IdProofEntryDraft[]>([{ type: "AADHAAR", file: null }]);

  useEffect(() => {
    if (!open) return;
    setPhoto(null);
    setPhotoRemoved(false);
    if (guarantor) {
      const sameAddr = JSON.stringify(guarantor.addressCurrent) === JSON.stringify(guarantor.addressPermanent);
      setSameAsCurrent(sameAddr && !!guarantor.addressCurrent?.line);
      setIdProofEntries(
        guarantor.idProofs.length
          ? guarantor.idProofs.map((e) => ({ type: e.type, otherTypeName: e.otherTypeName, number: e.number, file: null, existingUrl: e.documentUrl }))
          : [{ type: "AADHAAR", file: null }]
      );
      form.setFieldsValue({
        name: guarantor.name, phone: guarantor.phone,
        addressCurrent: guarantor.addressCurrent, addressPermanent: guarantor.addressPermanent,
      });
    } else {
      setSameAsCurrent(false);
      setIdProofEntries([{ type: "AADHAAR", file: null }]);
      form.resetFields();
    }
  }, [open, guarantor, form]);

  const mutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = {
        ...values, sameAsCurrentAddress: sameAsCurrent,
        idProofs: idProofEntries.map((e) => ({ type: e.type, otherTypeName: e.otherTypeName, number: e.number })),
      };
      const formData = new FormData();
      formData.append("data", new Blob([JSON.stringify(payload)], { type: "application/json" }));
      if (photo) formData.append("photo", photo);
      idProofEntries.forEach((e) => { if (e.file) formData.append(`idProofDocument_${e.type}`, e.file); });

      if (isEdit) {
        return (await api.put<Guarantor>(`/guarantors/${guarantor!.id}`, formData, { params: { removePhoto: photoRemoved } })).data;
      }
      return (await api.post<Guarantor>(`/customers/${customerId}/guarantors`, formData)).data;
    },
    onSuccess: () => {
      message.success(t("common.save"));
      onClose();
      queryClient.invalidateQueries({ queryKey: ["guarantors", customerId] });
      onSaved();
    },
    onError: (e) => message.error(t(`errors.${apiErrorCode(e)}`)),
  });

  const validateIdProofs = (): string | null => {
    const aadhaar = idProofEntries.find((e) => e.type === "AADHAAR");
    if (!aadhaar) return t("customers.aadharMandatory");
    if (!aadhaar.number || !/^\d{12}$/.test(aadhaar.number)) return t("customers.aadharInvalid");
    for (const e of idProofEntries) {
      if (e.type === "OTHER" && !e.otherTypeName?.trim()) return t("customers.idProofOtherNameRequired");
      if (!e.file && !e.existingUrl) return t("customers.idProofDocumentRequired");
    }
    return null;
  };

  const handleFinish = (values: Record<string, unknown>) => {
    const error = validateIdProofs();
    if (error) {
      message.error(error);
      return;
    }
    mutation.mutate(values);
  };

  return (
    <Drawer title={isEdit ? t("customers.editGuarantor") : t("customers.addGuarantor")} open={open} onClose={onClose} width={520} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <label style={{ cursor: "pointer", textAlign: "center" }}>
            <Avatar
              size={72}
              icon={!photo && !guarantor?.photoUrl ? <UserOutlined /> : undefined}
              src={photo ? URL.createObjectURL(photo) : !photoRemoved ? guarantor?.photoUrl : undefined}
              style={{ background: "var(--c-primary-light)", color: "var(--c-primary-dark)" }}
            />
            <div style={{ fontSize: 12.5, color: "var(--c-text-secondary)", marginTop: 6, display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
              <CameraOutlined /> {t("customers.photo")}
            </div>
            <input
              type="file"
              accept=".png,.jpg,.jpeg"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) { setPhoto(f); setPhotoRemoved(false); }
              }}
            />
          </label>
        </div>
        {(photo || guarantor?.photoUrl) && !photoRemoved && (
          <div style={{ textAlign: "center", marginBottom: 16, marginTop: -12 }}>
            <Button type="link" danger size="small" onClick={() => { setPhoto(null); setPhotoRemoved(true); }}>
              {t("customers.removePhoto")}
            </Button>
          </div>
        )}

        <Form.Item name="name" label={t("common.name")} rules={[{ required: true, message: t("common.required") }]}>
          <Input prefix={<UserOutlined style={{ color: "var(--c-text-faint)" }} />} />
        </Form.Item>
        <Form.Item name="phone" label={t("common.phone")} rules={[{ required: true, pattern: /^[6-9]\d{9}$/, message: t("customers.phoneInvalid") }]}>
          <Input prefix={<PhoneOutlined style={{ color: "var(--c-text-faint)" }} />} />
        </Form.Item>

        <div style={{ fontWeight: 600, fontSize: 13.5, margin: "16px 0 8px" }}>{t("customers.currentAddress")}</div>
        <AddressFields prefix="addressCurrent" />

        <Checkbox checked={sameAsCurrent} onChange={(e) => setSameAsCurrent(e.target.checked)} style={{ margin: "4px 0 12px" }}>
          {t("customers.permanentSameAsCurrent")}
        </Checkbox>

        {!sameAsCurrent && (
          <>
            <div style={{ fontWeight: 600, fontSize: 13.5, margin: "8px 0 8px" }}>{t("customers.permanentAddress")}</div>
            <AddressFields prefix="addressPermanent" />
          </>
        )}

        <IdProofsField entries={idProofEntries} onChange={setIdProofEntries} />

        <Button type="primary" htmlType="submit" block loading={mutation.isPending} size="large">{t("common.save")}</Button>
      </Form>
    </Drawer>
  );
}
