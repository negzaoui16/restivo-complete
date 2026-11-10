import { RestaurantsBrowser } from "../_components/RestaurantsBrowser";

export default function ExplorePage() {
  return (
    <>
      <h1 className="mt-3 mb-4 text-2xl font-extrabold tracking-tight text-[#1A1A1A] sm:text-3xl">Restaurants</h1>
      <RestaurantsBrowser />
    </>
  );
}
