/**
 * Icons shown next to questions and options — helps low-literacy users
 * recognise choices (SRS §5.1). Unknown keys simply render no icon.
 */
import {
  Accessibility, Armchair, Baby, BookOpen, Briefcase, Building2, Cake, CreditCard, Fish, GraduationCap, Hammer, HardHat, Heart, House,
  IndianRupee, Landmark, MapPin, Medal, Palette, Receipt, Search, Shield, Sprout, Store, User, Users, type LucideIcon,
} from 'lucide-react';

export const FIELD_ICONS: Partial<Record<string, LucideIcon>> = {
  state: MapPin,
  area: House,
  age: Cake,
  gender: User,
  occupation: Briefcase,
  incomeRange: IndianRupee,
  category: Users,
  minority: Landmark,
  student: GraduationCap,
  educationLevel: BookOpen,
  disability: Accessibility,
  bplCard: CreditCard,
  maritalStatus: Heart,
  pregnantOrLactating: Baby,
  bocwRegistered: HardHat,
  incomeTaxPayer: Receipt,
  exServiceman: Shield,
  hasGirlChild: Users,
};

export const OPTION_ICONS: Partial<Record<string, LucideIcon>> = {
  farmer: Sprout,
  student: GraduationCap,
  unorganised_worker: HardHat,
  street_vendor: Store,
  artisan: Hammer,
  self_employed: Briefcase,
  salaried: Building2,
  homemaker: House,
  unemployed: Search,
  retired: Armchair,
  fisher: Fish,
  sportsperson: Medal,
  artist: Palette,
  rural: Sprout,
  urban: Building2,
};
