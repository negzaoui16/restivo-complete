export type JoinRestaurant = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  description: string | null;
  coverUrl: string | null;
};

export type MyJoinRequest = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  status: "PENDING";
  message: string | null;
};

export type StaffMembership = {
  restaurantId: string;
  restaurantName: string;
  city: string | null;
  coverUrl: string | null;
};

export type JoinBoard = {
  membership: StaffMembership | null;
  requests: MyJoinRequest[];
  restaurants: JoinRestaurant[];
};

export type RosterMember = {
  id: string;
  userId: string;
  name: string;
  role: "STAFF" | "MANAGER";
  since: string | null;
};

export type RosterRequest = {
  id: string;
  userId: string;
  name: string;
  message: string | null;
  sentAt: string;
};

export type RestaurantRoster = {
  members: RosterMember[];
  requests: RosterRequest[];
};

export type RosterReview = {
  requestId: string;
  status: "ACCEPTED" | "DECLINED";
  member: RosterMember | null;
};
