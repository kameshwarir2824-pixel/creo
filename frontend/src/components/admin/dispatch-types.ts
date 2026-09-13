export type BacklogStatus = "urgent" | "medium" | "normal";

export interface BacklogItem {
  id: string;
  title: string;
  clientCompany: string;
  deliverableType: string;
  status: BacklogStatus;
  deliveryDate: string;
  priorityScore?: number;
}

export interface StaffMember {
  userId: string;
  fullName: string;
  email: string;
  department: string;
  skills: string[];
  activeWip: number;
  dailyCapacity: number;
  isAcceptingWork: boolean;
  onLeaveToday: boolean;
}

export const MOCK_BACKLOG_ITEMS: BacklogItem[] = [
  {
    id: "task-urg-101",
    title: "Brand Launch Campaign Hero Reel & Sound Design",
    clientCompany: "Apex Dynamics",
    deliverableType: "Reel",
    status: "urgent",
    deliveryDate: "Today, 5:00 PM",
  },
  {
    id: "task-med-102",
    title: "Quarterly Strategy 10-Slide Investor Carousel",
    clientCompany: "Zenith Flow Labs",
    deliverableType: "Carousel",
    status: "medium",
    deliveryDate: "Tomorrow, 12:00 PM",
  },
  {
    id: "task-urg-103",
    title: "Black Friday Paid Ad Motion Graphic 15s",
    clientCompany: "Velox Apparel",
    deliverableType: "Motion",
    status: "urgent",
    deliveryDate: "Tonight, 11:59 PM",
  },
  {
    id: "task-norm-104",
    title: "Minimalist Typography Series 5-Pack Static Ads",
    clientCompany: "Solarium Studios",
    deliverableType: "Static Post",
    status: "normal",
    deliveryDate: "Sept 16, 2026",
  },
  {
    id: "task-med-105",
    title: "Product Unboxing 4K Cutdown with Subtitles",
    clientCompany: "Hyperion Hardware",
    deliverableType: "Reel",
    status: "medium",
    deliveryDate: "Sept 15, 2026",
  },
  {
    id: "task-norm-106",
    title: "Monthly Brand Identity Guidelines PDF Refresh",
    clientCompany: "Nimbus Cloud",
    deliverableType: "Design Pack",
    status: "normal",
    deliveryDate: "Sept 18, 2026",
  },
];

export const MOCK_STAFF_MEMBERS: StaffMember[] = [
  {
    userId: "staff-01",
    fullName: "Elena Rostova",
    email: "elena@creo.agency",
    department: "Video Production",
    skills: ["After Effects", "Premiere Pro", "Color Grading"],
    activeWip: 2,
    dailyCapacity: 5,
    isAcceptingWork: true,
    onLeaveToday: false,
  },
  {
    userId: "staff-02",
    fullName: "Marcus Vance",
    email: "marcus@creo.agency",
    department: "Visual Design",
    skills: ["Figma", "Illustrator", "Typography"],
    activeWip: 4,
    dailyCapacity: 4,
    isAcceptingWork: false,
    onLeaveToday: false,
  },
  {
    userId: "staff-03",
    fullName: "Aria Chen",
    email: "aria@creo.agency",
    department: "3D & Motion",
    skills: ["Blender", "Cinema 4D", "Motion Design"],
    activeWip: 1,
    dailyCapacity: 3,
    isAcceptingWork: true,
    onLeaveToday: false,
  },
  {
    userId: "staff-04",
    fullName: "David K.",
    email: "david@creo.agency",
    department: "Copy & Creative",
    skills: ["Copywriting", "Storyboarding", "Creative Direction"],
    activeWip: 0,
    dailyCapacity: 4,
    isAcceptingWork: false,
    onLeaveToday: true,
  },
  {
    userId: "staff-05",
    fullName: "Priya Sharma",
    email: "priya@creo.agency",
    department: "Visual Design",
    skills: ["Carousels", "Brand Identity", "Social Graphics"],
    activeWip: 3,
    dailyCapacity: 5,
    isAcceptingWork: true,
    onLeaveToday: false,
  },
];
