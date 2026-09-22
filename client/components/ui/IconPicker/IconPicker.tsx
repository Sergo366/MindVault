import React, { useState, useRef, useEffect } from 'react';
import {
  Shirt,
  Footprints,
  Watch,
  Glasses,
  Crown,
  Gem,
  Briefcase,
  ShoppingBag,
  Umbrella,
  Scissors,
  Palette,
  Sparkles,
  Heart,
  Star,
  Sun,
  Snowflake,
  CloudRain,
  Wind,
  Flame,
  Zap,
  Award,
  Gift,
  Tag,
  Bookmark,
  CircleDot,
  Diamond,
  Pentagon,
  Hexagon,
  Triangle,
  Square,
  Dumbbell,
  Trophy,
  Camera,
  Wallet,
  Backpack,
  HardHat,
  GraduationCap,
  Ghost,
  Plane,
  Coffee,
  Wine,
  Music,
  User,
  Shield,
  Cloud,
  Anchor,
  Compass,
  Key,
  Map,
  Archive,
  Inbox,
  Layers,
  Smile,
  Moon,
  SunDim,
  TreePine,
  Leaf,
  Mountain,
  Waves,
  Ticket,
  WashingMachine,
  Ruler,
  PersonStanding,
  Pocket,
  ChefHat,
  ShoppingBasket,
  ChevronDown,
  DollarSign,
  EyeOff,
  type LucideIcon,
} from 'lucide-react';

export interface IconOption {
  name: string;
  icon: LucideIcon;
}

export const CATEGORY_ICONS: IconOption[] = [
  { name: 'Shirt', icon: Shirt },
  { name: 'Footprints', icon: Footprints },
  { name: 'Watch', icon: Watch },
  { name: 'Glasses', icon: Glasses },
  { name: 'Crown', icon: Crown },
  { name: 'Gem', icon: Gem },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'ShoppingBag', icon: ShoppingBag },
  { name: 'Umbrella', icon: Umbrella },
  { name: 'Scissors', icon: Scissors },
  { name: 'Palette', icon: Palette },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Heart', icon: Heart },
  { name: 'Star', icon: Star },
  { name: 'Sun', icon: Sun },
  { name: 'Snowflake', icon: Snowflake },
  { name: 'CloudRain', icon: CloudRain },
  { name: 'Wind', icon: Wind },
  { name: 'Flame', icon: Flame },
  { name: 'Zap', icon: Zap },
  { name: 'Award', icon: Award },
  { name: 'Gift', icon: Gift },
  { name: 'Tag', icon: Tag },
  { name: 'Bookmark', icon: Bookmark },
  { name: 'Dumbbell', icon: Dumbbell },
  { name: 'Trophy', icon: Trophy },
  { name: 'Camera', icon: Camera },
  { name: 'Wallet', icon: Wallet },
  { name: 'Backpack', icon: Backpack },
  { name: 'HardHat', icon: HardHat },
  { name: 'GraduationCap', icon: GraduationCap },
  { name: 'Ghost', icon: Ghost },
  { name: 'Plane', icon: Plane },
  { name: 'Coffee', icon: Coffee },
  { name: 'Wine', icon: Wine },
  { name: 'Music', icon: Music },
  { name: 'User', icon: User },
  { name: 'Shield', icon: Shield },
  { name: 'Cloud', icon: Cloud },
  { name: 'Anchor', icon: Anchor },
  { name: 'Compass', icon: Compass },
  { name: 'Key', icon: Key },
  { name: 'Map', icon: Map },
  { name: 'Archive', icon: Archive },
  { name: 'Inbox', icon: Inbox },
  { name: 'Layers', icon: Layers },
  { name: 'Smile', icon: Smile },
  { name: 'Moon', icon: Moon },
  { name: 'SunDim', icon: SunDim },
  { name: 'Tree', icon: TreePine },
  { name: 'Leaf', icon: Leaf },
  { name: 'Mountain', icon: Mountain },
  { name: 'Waves', icon: Waves },
  { name: 'Ticket', icon: Ticket },
  { name: 'WashingMachine', icon: WashingMachine },
  { name: 'Ruler', icon: Ruler },
  { name: 'Person', icon: PersonStanding },
  { name: 'Pocket', icon: Pocket },
  { name: 'ChefHat', icon: ChefHat },
  { name: 'ShoppingBasket', icon: ShoppingBasket },
  { name: 'Circle', icon: CircleDot },
  { name: 'Diamond', icon: Diamond },
  { name: 'Pentagon', icon: Pentagon },
  { name: 'Hexagon', icon: Hexagon },
  { name: 'Triangle', icon: Triangle },
  { name: 'Square', icon: Square },
  { name: 'DollarSign', icon: DollarSign },
  { name: 'EyeOff', icon: EyeOff },
];

export const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  CATEGORY_ICONS.map((item) => [item.name, item.icon]),
);

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  disabled?: boolean;
}

export function IconPicker({ value, onChange, disabled }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const SelectedIcon = value ? ICON_MAP[value] : null;

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (name: string) => {
    onChange(value === name ? '' : name);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-3 bg-zinc-900 border rounded-xl px-4 py-3 text-left cursor-pointer transition-all duration-200
          ${isOpen
            ? 'border-primary/50 ring-2 ring-primary/20'
            : 'border-zinc-800 hover:border-zinc-600'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {SelectedIcon ? (
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <SelectedIcon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-white text-sm">{value}</span>
          </div>
        ) : (
          <span className="text-zinc-500 text-sm">Select an icon...</span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 mt-2 p-3 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/40 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div 
            className="grid grid-cols-6 gap-1.5 max-h-[240px] overflow-y-auto pr-1 overscroll-contain custom-scrollbar"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {CATEGORY_ICONS.map(({ name, icon: Icon }) => {
              const isSelected = value === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelect(name)}
                  title={name}
                  className={`
                    p-2.5 rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-center
                    ${
                      isSelected
                        ? 'bg-primary/20 text-primary border border-primary/40 ring-2 ring-primary/20 scale-105'
                        : 'text-zinc-400 border border-transparent hover:border-zinc-700 hover:text-white hover:bg-zinc-800 hover:scale-105'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
