import type { ThemeConfig } from "antd";

/** Design tokens mirroring the CSS variables in index.css, so Ant Design components (which
 * render through portals/popups that CSS alone can't easily reach) match the rest of the app. */
export const theme: ThemeConfig = {
  token: {
    colorPrimary: "#0fa968",
    colorSuccess: "#0fa968",
    colorWarning: "#d97706",
    colorError: "#dc2626",
    colorInfo: "#2563eb",
    colorLink: "#0fa968",

    colorTextBase: "#0a2540",
    colorTextSecondary: "#5a6b7f",
    colorTextTertiary: "#8d9aab",
    colorBgLayout: "#f4f7fa",
    colorBgContainer: "#ffffff",
    colorBorder: "#e5e9ef",
    colorBorderSecondary: "#eef1f5",

    fontFamily:
      '"Plus Jakarta Sans", "Inter", "Noto Sans Tamil", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 8,

    boxShadow: "0 1px 2px rgba(16,24,32,0.04), 0 1px 1px rgba(16,24,32,0.03)",
    boxShadowSecondary: "0 4px 10px rgba(16,24,32,0.06), 0 2px 4px rgba(16,24,32,0.04)",

    controlHeight: 40,
    controlHeightLG: 46,
  },
  components: {
    Layout: {
      headerBg: "#ffffff",
      bodyBg: "#f4f7fa",
      siderBg: "#ffffff",
      headerHeight: 64,
      headerPadding: "0 20px",
    },
    Menu: {
      itemHeight: 44,
      itemBorderRadius: 10,
      itemMarginInline: 10,
      itemSelectedBg: "#e4f8ee",
      itemSelectedColor: "#0b7a53",
      itemHoverBg: "#f3f5f6",
      iconSize: 17,
      fontSize: 14.5,
    },
    Card: {
      borderRadiusLG: 16,
      boxShadowTertiary: "0 1px 2px rgba(16,24,32,0.04)",
      paddingLG: 22,
    },
    Button: {
      borderRadius: 10,
      controlHeight: 40,
      fontWeight: 500,
      primaryShadow: "none",
    },
    Input: {
      borderRadius: 10,
      controlHeight: 40,
      paddingInline: 14,
    },
    InputNumber: {
      borderRadius: 10,
      controlHeight: 40,
    },
    Select: {
      borderRadius: 10,
      controlHeight: 40,
    },
    DatePicker: {
      borderRadius: 10,
      controlHeight: 40,
    },
    Table: {
      borderRadius: 12,
      headerBg: "#fafbfc",
      headerColor: "#5a6b7f",
      rowHoverBg: "#f4f9f7",
      cellPaddingBlock: 14,
    },
    Tabs: {
      inkBarColor: "#0fa968",
      itemSelectedColor: "#0fa968",
      itemHoverColor: "#0b7a53",
      titleFontSize: 14.5,
    },
    Tag: {
      borderRadiusSM: 6,
      defaultBg: "#f3f5f6",
    },
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 24,
    },
    Drawer: {
      borderRadiusLG: 0,
    },
    Modal: {
      borderRadiusLG: 16,
    },
    Segmented: {
      itemSelectedBg: "#ffffff",
      trackBg: "#f0f2f3",
      borderRadius: 8,
    },
  },
};
