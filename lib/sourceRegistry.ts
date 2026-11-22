/** Evaluation registry, not activation or a representation of a redistribution license. */
export const sourceRegistry = [
  {id:'espn',kind:'news-discovery',enabled:true,status:'existing-integration-terms-review',commercialPermission:'unverified',terms:'https://disneytermsofuse.com/'},
  {id:'mlb-rss',kind:'official-feed',enabled:false,status:'permission-required',commercialPermission:'not-approved',terms:'https://www.mlb.com/official-information/terms-of-use'},
  {id:'gnews',kind:'news-api',enabled:false,status:'paid-plan-and-rights-review-required',monthlyPrice:'EUR 49.99',pricing:'https://gnews.io/pricing'},
  {id:'newsapi',kind:'news-api',enabled:false,status:'paid-plan-and-rights-review-required',monthlyPrice:'USD 449',pricing:'https://newsapi.org/pricing'},
] as const;
