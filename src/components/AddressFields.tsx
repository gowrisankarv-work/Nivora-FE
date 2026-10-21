import { Form, Input, Row, Col } from "antd";
import { useTranslation } from "react-i18next";
import type { NamePath } from "antd/es/form/interface";

/** Address block (line/village/taluk/district/pincode) reused for current/permanent addresses on Customer and Guarantor forms. */
export function AddressFields({ prefix }: { prefix: string }) {
  const { t } = useTranslation();
  const name = (field: string): NamePath => [prefix, field];

  return (
    <>
      <Row gutter={8}>
        <Col span={12}><Form.Item name={name("line")} label={t("customers.line")} rules={[{ required: true, message: t("common.required") }]}><Input /></Form.Item></Col>
        <Col span={12}><Form.Item name={name("village")} label={t("common.village")} rules={[{ required: true, message: t("common.required") }]}><Input /></Form.Item></Col>
      </Row>
      <Row gutter={8}>
        <Col span={8}><Form.Item name={name("taluk")} label={t("customers.taluk")}><Input /></Form.Item></Col>
        <Col span={8}><Form.Item name={name("district")} label={t("customers.district")}><Input /></Form.Item></Col>
        <Col span={8}><Form.Item name={name("pincode")} label={t("customers.pincode")} rules={[{ pattern: /^\d{6}$/, message: t("customers.pincodeInvalid") }]}><Input maxLength={6} /></Form.Item></Col>
      </Row>
    </>
  );
}
