type ProductType = {
  id: number;
  imageUrl?: string;
  name: string;
  placeName: string;
  city?: string;
  country?: string;
  price?: string;
  date?: string;
  isFavorite: boolean;
  list_id: number;
  location?: LocationType;
};