export const OFFICIAL_RESULTS_SOURCES = {
  primary:
    "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums",
  secondary:
    "https://www.fourfourtwo.com/competition/all-of-the-world-cup-scores-so-far-at-the-2026-tournament",
} as const;

export type OfficialResolutionMethod =
  | "REGULAR"
  | "EXTRA_TIME"
  | "PENALTIES";

export type OfficialMatchResult = {
  matchNumber: number;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  resolutionMethod: OfficialResolutionMethod | null;
  advancesTeamName: string | null;
};

type OfficialResultTuple = readonly [
  matchNumber: number,
  homeTeamName: string,
  awayTeamName: string,
  homeScore: number,
  awayScore: number,
  resolutionMethod: OfficialResolutionMethod | null,
  advancesTeamName: string | null,
];

const OFFICIAL_RESULT_TUPLES: OfficialResultTuple[] = [
  [1, "Mexico", "South Africa", 2, 0, null, null],
  [2, "Korea Republic", "Czechia", 2, 1, null, null],
  [3, "Canada", "Bosnia and Herzegovina", 1, 1, null, null],
  [4, "United States", "Paraguay", 4, 1, null, null],
  [5, "Qatar", "Switzerland", 1, 1, null, null],
  [6, "Brazil", "Morocco", 1, 1, null, null],
  [7, "Haiti", "Scotland", 0, 1, null, null],
  [8, "Australia", "Türkiye", 2, 0, null, null],
  [9, "Germany", "Curaçao", 7, 1, null, null],
  [10, "Netherlands", "Japan", 2, 2, null, null],
  [11, "Ivory Coast", "Ecuador", 1, 0, null, null],
  [12, "Sweden", "Tunisia", 5, 1, null, null],
  [13, "Spain", "Cape Verde", 0, 0, null, null],
  [14, "Belgium", "Egypt", 1, 1, null, null],
  [15, "Saudi Arabia", "Uruguay", 1, 1, null, null],
  [16, "Iran", "New Zealand", 2, 2, null, null],
  [17, "France", "Senegal", 3, 1, null, null],
  [18, "Iraq", "Norway", 1, 4, null, null],
  [19, "Argentina", "Algeria", 3, 0, null, null],
  [20, "Austria", "Jordan", 3, 1, null, null],
  [21, "Portugal", "DR Congo", 1, 1, null, null],
  [22, "England", "Croatia", 4, 2, null, null],
  [23, "Ghana", "Panama", 1, 0, null, null],
  [24, "Uzbekistan", "Colombia", 1, 3, null, null],
  [25, "Czechia", "South Africa", 1, 1, null, null],
  [26, "Switzerland", "Bosnia and Herzegovina", 4, 1, null, null],
  [27, "Canada", "Qatar", 6, 0, null, null],
  [28, "Mexico", "Korea Republic", 1, 0, null, null],
  [29, "United States", "Australia", 2, 0, null, null],
  [30, "Scotland", "Morocco", 0, 1, null, null],
  [31, "Brazil", "Haiti", 3, 0, null, null],
  [32, "Türkiye", "Paraguay", 0, 1, null, null],
  [33, "Netherlands", "Sweden", 5, 1, null, null],
  [34, "Germany", "Ivory Coast", 2, 1, null, null],
  [35, "Ecuador", "Curaçao", 0, 0, null, null],
  [36, "Tunisia", "Japan", 0, 4, null, null],
  [37, "Spain", "Saudi Arabia", 4, 0, null, null],
  [38, "Belgium", "Iran", 0, 0, null, null],
  [39, "Uruguay", "Cape Verde", 2, 2, null, null],
  [40, "New Zealand", "Egypt", 1, 3, null, null],
  [41, "Argentina", "Austria", 2, 0, null, null],
  [42, "France", "Iraq", 3, 0, null, null],
  [43, "Norway", "Senegal", 3, 2, null, null],
  [44, "Jordan", "Algeria", 1, 2, null, null],
  [45, "Portugal", "Uzbekistan", 5, 0, null, null],
  [46, "England", "Ghana", 0, 0, null, null],
  [47, "Panama", "Croatia", 0, 1, null, null],
  [48, "Colombia", "DR Congo", 1, 0, null, null],
  [49, "Switzerland", "Canada", 2, 1, null, null],
  [50, "Bosnia and Herzegovina", "Qatar", 3, 1, null, null],
  [51, "Scotland", "Brazil", 0, 3, null, null],
  [52, "Morocco", "Haiti", 4, 2, null, null],
  [53, "Czechia", "Mexico", 0, 3, null, null],
  [54, "South Africa", "Korea Republic", 1, 0, null, null],
  [55, "Ecuador", "Germany", 2, 1, null, null],
  [56, "Curaçao", "Ivory Coast", 0, 2, null, null],
  [57, "Japan", "Sweden", 1, 1, null, null],
  [58, "Tunisia", "Netherlands", 1, 3, null, null],
  [59, "Türkiye", "United States", 3, 2, null, null],
  [60, "Paraguay", "Australia", 0, 0, null, null],
  [61, "Norway", "France", 1, 4, null, null],
  [62, "Senegal", "Iraq", 5, 0, null, null],
  [63, "Cape Verde", "Saudi Arabia", 0, 0, null, null],
  [64, "Uruguay", "Spain", 0, 1, null, null],
  [65, "Egypt", "Iran", 1, 1, null, null],
  [66, "New Zealand", "Belgium", 1, 5, null, null],
  [67, "Panama", "England", 0, 2, null, null],
  [68, "Croatia", "Ghana", 2, 1, null, null],
  [69, "Colombia", "Portugal", 0, 0, null, null],
  [70, "DR Congo", "Uzbekistan", 3, 1, null, null],
  [71, "Algeria", "Austria", 3, 3, null, null],
  [72, "Jordan", "Argentina", 1, 3, null, null],
  [73, "South Africa", "Canada", 0, 1, "REGULAR", "Canada"],
  [74, "Germany", "Paraguay", 1, 1, "PENALTIES", "Paraguay"],
  [75, "Netherlands", "Morocco", 1, 1, "PENALTIES", "Morocco"],
  [76, "Brazil", "Japan", 2, 1, "REGULAR", "Brazil"],
  [77, "France", "Sweden", 3, 0, "REGULAR", "France"],
  [78, "Ivory Coast", "Norway", 1, 2, "REGULAR", "Norway"],
  [79, "Mexico", "Ecuador", 2, 0, "REGULAR", "Mexico"],
  [80, "England", "DR Congo", 2, 1, "REGULAR", "England"],
  [81, "United States", "Bosnia and Herzegovina", 2, 0, "REGULAR", "United States"],
  [82, "Belgium", "Senegal", 3, 2, "EXTRA_TIME", "Belgium"],
  [83, "Portugal", "Croatia", 2, 1, "REGULAR", "Portugal"],
  [84, "Spain", "Austria", 3, 0, "REGULAR", "Spain"],
  [85, "Switzerland", "Algeria", 2, 0, "REGULAR", "Switzerland"],
  [86, "Argentina", "Cape Verde", 3, 2, "EXTRA_TIME", "Argentina"],
  [87, "Colombia", "Ghana", 1, 0, "REGULAR", "Colombia"],
  [88, "Australia", "Egypt", 1, 1, "PENALTIES", "Egypt"],
  [89, "Paraguay", "France", 0, 1, "REGULAR", "France"],
  [90, "Canada", "Morocco", 0, 3, "REGULAR", "Morocco"],
  [91, "Brazil", "Norway", 1, 2, "REGULAR", "Norway"],
  [92, "Mexico", "England", 2, 3, "REGULAR", "England"],
  [93, "Portugal", "Spain", 0, 1, "REGULAR", "Spain"],
  [94, "United States", "Belgium", 1, 4, "REGULAR", "Belgium"],
  [95, "Argentina", "Egypt", 3, 2, "REGULAR", "Argentina"],
  [96, "Switzerland", "Colombia", 0, 0, "PENALTIES", "Switzerland"],
  [97, "France", "Morocco", 2, 0, "REGULAR", "France"],
  [98, "Spain", "Belgium", 2, 1, "REGULAR", "Spain"],
  [99, "Norway", "England", 1, 2, "EXTRA_TIME", "England"],
  [100, "Argentina", "Switzerland", 3, 1, "EXTRA_TIME", "Argentina"],
];

export const OFFICIAL_MATCH_RESULTS: OfficialMatchResult[] =
  OFFICIAL_RESULT_TUPLES.map(
    ([
      matchNumber,
      homeTeamName,
      awayTeamName,
      homeScore,
      awayScore,
      resolutionMethod,
      advancesTeamName,
    ]) => ({
      matchNumber,
      homeTeamName,
      awayTeamName,
      homeScore,
      awayScore,
      resolutionMethod,
      advancesTeamName,
    }),
  );
