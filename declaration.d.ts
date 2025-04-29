declare module "react-native-ios-context-menu" {
  import { ComponentType } from "react";
  import { StyleProp, ViewStyle } from "react-native";

  export interface MenuConfig {
    menuTitle?: string;
    menuItems: MenuItem[];
  }

  export interface MenuItem {
    actionKey: string;
    actionTitle: string;
    menuAttributes?: string[];
    icon?: {
      type: string;
      imageValue: {
        systemName?: string;
        [key: string]: any;
      };
    };
    [key: string]: any;
  }

  export interface PreviewConfig {
    previewType?: "DEFAULT" | "CUSTOM";
    backgroundColor?: string;
    [key: string]: any;
  }

  export interface ContextMenuViewProps {
    style?: StyleProp<ViewStyle>;
    menuConfig: MenuConfig;
    onPressMenuItem: (event: { nativeEvent: any }) => void;
    onPress?: () => void;
    previewConfig?: PreviewConfig;
    [key: string]: any;
  }

  export const ContextMenuView: ComponentType<ContextMenuViewProps>;
  export const ContextMenuButton: ComponentType<ContextMenuButtonProps>;
}
