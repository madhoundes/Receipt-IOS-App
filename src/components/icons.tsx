// Icon set for the app: Iconsax (Linear). Import icons from here, not from the library,
// so the whole app stays on one style. Names on the left are the ones screens use.
import { colors } from '../theme';
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import * as I from 'iconsax-react-native';

export type IconProps = {
  size?: number;
  color?: string;
  /** Kept for older call sites; Iconsax has a fixed stroke. */
  strokeWidth?: number;
  fill?: string;
  variant?: 'Linear' | 'Bold' | 'Outline' | 'Broken' | 'Bulk' | 'TwoTone';
  style?: any;
};
export type AppIcon = React.FC<IconProps>;
/** @deprecated use AppIcon */
export type LucideIcon = AppIcon;

const wrap = (C: I.Icon): AppIcon => ({ size = 24, color = colors.text, variant = 'Linear', style }) => (
  <C size={size} color={color} variant={variant} style={style} />
);

// Iconsax has no bare cross or tick, so these two are drawn to match its 1.5 pt round stroke.
const stroke = (d: string): AppIcon => ({ size = 24, color = colors.text, strokeWidth = 1.8, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
export const X = stroke('M7 7l10 10M17 7L7 17');
export const Check = stroke('M6 12.5l4 4 8-9');

// Navigation and actions
export const ChevronRight = wrap(I.ArrowRight2);
export const ChevronLeft = wrap(I.ArrowLeft2);
export const ChevronDown = wrap(I.ArrowDown2);
export const ArrowRight = wrap(I.ArrowRight);
export const Plus = wrap(I.Add);
export const Search = wrap(I.SearchNormal1);
export const Share = wrap(I.Export);
export const Share2 = wrap(I.ExportSquare);
export const Copy = wrap(I.Copy);
export const Maximize2 = wrap(I.Maximize4);
export const SlidersHorizontal = wrap(I.Setting4);
export const Sort = wrap(I.Sort);
export const More = wrap(I.More);
export const Trash = wrap(I.Trash);
export const Edit = wrap(I.Edit2);
export const LogOut = wrap(I.Logout);
export const Eye = wrap(I.Eye);
export const EyeOff = wrap(I.EyeSlash);
export const Grip = wrap(I.HambergerMenu);

// Tabs
export const Home = wrap(I.Home2);
export const ReceiptText = wrap(I.Receipt2);
export const LayoutGrid = wrap(I.Category);
export const Percent = wrap(I.PercentageCircle);
export const Settings = wrap(I.Setting2);
export const User = wrap(I.ProfileCircle);

// Capture
export const Camera = wrap(I.Camera);
export const Scan = wrap(I.Scan);
export const ScanLine = wrap(I.Scan);
export const Zap = wrap(I.Flash);
export const ZapOff = wrap(I.FlashSlash);
export const Image = wrap(I.Gallery);
export const ImageOff = wrap(I.GallerySlash);
export const Crop = wrap(I.Crop);
export const RotateLeft = wrap(I.RotateLeft);
export const Sparkles = wrap(I.MagicStar);

// Status and info
export const AlertTriangle = wrap(I.Danger);
export const Info = wrap(I.InfoCircle);
export const CheckCircle = wrap(I.TickCircle);
export const CircleSlash = wrap(I.Slash);
export const Lightbulb = wrap(I.LampOn);
export const Sun = wrap(I.Sun1);
export const Clock = wrap(I.Clock);
export const Bell = wrap(I.Notification);
export const Lock = wrap(I.Lock);
export const Undo = wrap(I.Back);
export const Calendar = wrap(I.Calendar);

// Money and reports
export const BarChart3 = wrap(I.Chart);
export const PieChart = wrap(I.Graph);
export const TrendUp = wrap(I.TrendUp);
export const DollarSign = wrap(I.DollarCircle);
export const CreditCard = wrap(I.Card);
export const FileText = wrap(I.DocumentText);
export const FileDown = wrap(I.DocumentDownload);
export const Layers = wrap(I.Layer);

// Categories
export const ShoppingBasket = wrap(I.ShoppingCart);
export const Utensils = wrap(I.Reserve);
export const Fuel = wrap(I.GasStation);
export const Pill = wrap(I.Health);
export const MonitorSmartphone = wrap(I.Monitor);
export const Shirt = wrap(I.Bag2);
export const Car = wrap(I.Car);
export const Clapperboard = wrap(I.VideoPlay);
export const Wrench = wrap(I.Setting3);
export const Box = wrap(I.Box);
export const Cloud = wrap(I.Cloud);
export const Briefcase = wrap(I.Briefcase);
export const Tag = wrap(I.Tag2);
