export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string;
  telegram_handle: string | null;
  whatsapp_number: string | null;
  phone: string | null;
  role: "owner" | "seller";
  created_at: string;
};

export type ListingStatus = "ACTIVE" | "SOLD" | "ARCHIVED";
export type ClipStatus = "none" | "pending" | "ready" | "failed";

export type Listing = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  price: number;
  status: ListingStatus;
  telegram_message_id: number | null;
  telegram_message_ids?: number[] | null;
  clip_url?: string | null;
  clip_status?: ClipStatus;
  created_at: string;
};

export type ListingMedia = {
  id: string;
  listing_id: string;
  type: "image" | "video";
  url: string;
  sort_order: number;
  poster_url: string | null;
  created_at: string;
};

export type ListingWithMedia = Listing & {
  listing_media: ListingMedia[];
  profiles?: Profile;
};
