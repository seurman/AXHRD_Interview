export type Locale = "ko" | "en";

export const LOCALES: Locale[] = ["ko", "en"];
export const DEFAULT_LOCALE: Locale = "ko";
export const LOCALE_COOKIE = "hr_in_locale";

export type Dictionary = {
  meta: {
    title: string;
    description: string;
  };
  common: {
    brand: string;
    nav: {
      dashboard: string;
      prepare: string;
      discover: string;
      interview: string;
      resumeReview: string;
      cards: string;
      trialInterview: string;
      profile: string;
    };
    navLong: {
      dashboard: string;
      prepare: string;
      discover: string;
      interview: string;
      resumeReview: string;
      cards: string;
      trialInterview: string;
      profile: string;
    };
    auth: {
      login: string;
      register: string;
      logout: string;
    };
    admin: {
      title: string;
      content: string;
      demo: string;
      users: string;
      audit: string;
      sessions: string;
      orgApprove: string;
      saasAdmin: string;
      orgBenchmark: string;
      subscriptions: string;
      permissions: string;
      sections: {
        content: string;
        tenants: string;
        security: string;
        billing: string;
      };
    };
    saas: {
      title: string;
      settings: string;
      cohortDashboard: string;
      settingsHub: string;
      interviewKit: string;
    };
    language: {
      label: string;
      ko: string;
      en: string;
    };
    theme: {
      label: string;
      light: string;
      dark: string;
    };
    explore: string;
    menu: string;
    userSuffix: string;
  };
  home: {
    hero: {
      eyebrow: string;
      brand: string;
      titleLine1: string;
      titleHighlight: string;
      subtitle: string;
      ctaStart: string;
      ctaStartLoggedIn: string;
      ctaPersonal: string;
      ctaEnterprise: string;
      imageAlt: string;
      bullets: string[];
    };
    preview: {
      interview: {
        label: string;
        sessionTitle: string;
        competency: string;
        level: string;
        question: string;
        chips: string[];
        resumeLabel: string;
        resumeQuote: string;
        recording: string;
        itemProgress: string;
      };
      chipHistory: { symbol: string; label: string; tone: "pass" | "attempt" | "down" }[];
      feedback: {
        label: string;
        score: string;
        quote: string;
        note: string;
      };
      dashboard: {
        label: string;
        theta: string;
        rows: { label: string; pct: number; delta: string }[];
        legend: string;
      };
    };
    gallery: {
      ariaLabel: string;
      items: {
        kicker: string;
        title: string;
        desc: string;
        mock: string[];
      }[];
    };
    spotlightVisual: {
      scoreLabel: string;
      score: string;
      scoreUnit: string;
      dimensions: { label: string; pct: number }[];
      quote: string;
      quoteSource: string;
    };
    stats: {
      competencies: string;
      adaptive: string;
      anytime: string;
    };
    proof: {
      eyebrow: string;
      title: string;
      items: string[];
    };
    modules: {
      eyebrow: string;
      title: string;
      subtitle: string;
    };
    features: {
      interview: { title: string; desc: string; chips: string[] };
      discover: { title: string; desc: string; chips: string[] };
      tracking: { title: string; desc: string; chips: string[] };
      cards: { title: string; desc: string; chips: string[] };
    };
    spotlight: {
      eyebrow: string;
      title: string;
      desc: string;
      points: string[];
      cta: string;
      imageAlt: string;
    };
    values: {
      eyebrow: string;
      title: string;
      subtitle: string;
      trustBadges: string[];
      transparent: { title: string; desc: string };
      adaptive: { title: string; desc: string };
      growth: { title: string; desc: string };
      ncs: { title: string; desc: string };
      miniStats: { value: string; label: string }[];
    };
    enterprise: {
      eyebrow: string;
      title: string;
      desc: string;
      cta: string;
      imageAlt: string;
    };
    cta: {
      title: string;
      subtitle: string;
      button: string;
      buttonLoggedIn: string;
    };
  };
  swipe: {
    eyebrow: string;
    title: string;
    subtitle: string;
    setupTitle: string;
    setupEyebrow: string;
    startDeck: string;
    saved: string;
    progress: string;
    pass: string;
    save: string;
    passLabel: string;
    saveLabel: string;
    cardEyebrow: string;
    cardHint: string;
    empty: string;
    retry: string;
    savedTitle: string;
    savedEmpty: string;
    comboHint: string;
    recycledHint: string;
    stampPass: string;
    stampSave: string;
    loadError: string;
    practiceAgain: string;
    practiceStart: string;
    practiceNote: string;
    complete: string;
    recordAgain: string;
  };
  dashboard: {
    differentiation: {
      title: string;
      items: string[];
      link: string;
    };
    stats: {
      careerLevel: string;
      sessions: string;
      avgPercentile: string;
      strongest: string;
      improve: string;
      skillTree: string;
      radar: string;
      growth: string;
    };
  };
  setup: {
    title: string;
    subtitle: string;
    industry: { title: string; hint: string; placeholder: string; companyPlaceholder: string };
    companySize: { title: string; hint: string };
    jd: {
      hint: string;
      upload: string;
      parsing: string;
      manual: string;
      placeholder: string;
      urlLabel: string;
      urlPlaceholder: string;
      urlFetch: string;
      urlFetching: string;
      urlSuccess: string;
      urlRequired: string;
    };
    job: { title: string };
    persona: { eyebrow: string };
    competency: { title: string; hint: string; plan: string; recommended: string; done: string; inProgress: string; notStarted: string };
    resume: { title: string; hint: string; upload: string; parsing: string; manual: string; placeholder: string };
    resumeReview: { button: string; preparing: string; needResume: string; needIndustry: string };
    start: string;
    preparing: string;
    selectIndustry: string;
    selectCompetency: string;
    companySizes: Record<string, string>;
  };
  discover: {
    eyebrow: string;
    title: string;
    subtitle: string;
    notInterview: { title: string; items: string[] };
    methodology: { title: string; desc: string };
    start: string;
    loginStart: string;
    footer: string;
  };
  auth: {
    login: string;
    register: string;
    loginDesc: string;
    registerDesc: string;
    email: string;
    password: string;
    name: string;
    submitLogin: string;
    submitRegister: string;
    switchToRegister: string;
    switchToLogin: string;
    errorGeneric: string;
  };
};
