export function useSFFilter(arr: any[], view: string, rep: string) {
  return view === "rep" && rep ? arr.filter((x: any) => x.rep === rep) : arr;
}
