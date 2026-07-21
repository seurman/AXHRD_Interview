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
      home: string;
      prepare: string;
      growth: string;
      practice: string;
      activity: string;
      products: string;
      pricing: string;
      discover: string;
      interview: string;
      assessment: string;
      resumeReview: string;
      cards: string;
      path: string;
      trialInterview: string;
      profile: string;
    };
    navLong: {
      dashboard: string;
      prepare: string;
      discover: string;
      interview: string;
      assessment: string;
      resumeReview: string;
      cards: string;
      path: string;
      trialInterview: string;
      profile: string;
    };
    auth: {
      login: string;
      register: string;
      logout: string;
      adminMode: string;
    };
    admin: {
      title: string;
      overview: string;
      consoleTitle: string;
      backToService: string;
      content: string;
      assessmentTasks: string;
      repository: string;
      demo: string;
      users: string;
      audit: string;
      sessions: string;
      dataStorage: string;
      orgApprove: string;
      saasAdmin: string;
      orgBenchmark: string;
      subscriptions: string;
      permissions: string;
      diagnostic: string;
      workspaces: {
        tenants: string;
        product: string;
        operations: string;
        settings: string;
      };
      sections: {
        tenants: string;
        product: string;
        operations: string;
        settings: string;
      };
    };
    saas: {
      title: string;
      settings: string;
      cohortDashboard: string;
      peopleDashboard: string;
      diagnosticDashboard: string;
      candidateResults: string;
      members: string;
      settingsHub: string;
      interviewKit: string;
    };
    workspace: {
      label: string;
      personal: string;
      org: string;
    };
    guestProducts: {
      allProducts: string;
      trialInterview: string;
      discover: string;
      resume: string;
      interview: string;
      practice: string;
      growth: string;
      orgDiagnosis: string;
      forOrganizations: string;
    };
    avatar: {
      menu: string;
      profile: string;
      billing: string;
    };
    mobileNav: {
      home: string;
      growth: string;
      practice: string;
      org: string;
      more: string;
      cohort: string;
      diagnostic: string;
      settings: string;
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
    navigating: string;
    menuLoading: string;
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
      ctaDemo: string;
      ctaTrial: string;
      aside: string;
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
      resume: {
        label: string;
        score: string;
        highlight: string;
        note: string;
      };
      diagnostic: {
        label: string;
        wave: string;
        metric: string;
        teams: string[];
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
    bento: {
      label: string;
      open: string;
    };
    rail: {
      title: string;
      subtitle: string;
      hint: string;
      open: string;
    };
    doors: {
      personal: { label: string; title: string; cta: string };
      org: { label: string; title: string; cta: string };
    };
    marquee: string[];
    paths: {
      personal: { label: string; headline: string; cta: string };
      org: { label: string; headline: string; cta: string };
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
    painPoints: {
      eyebrow: string;
      title: string;
      subtitle: string;
      items: { title: string; desc: string }[];
      closing: string;
      contactCta: string;
    };
    howItWorks: {
      eyebrow: string;
      title: string;
      steps: { num: string; title: string; desc: string; points: string[] }[];
    };
    platformTour: {
      eyebrow: string;
      title: string;
      tabs: {
        id: "personal" | "org";
        label: string;
        headline: string;
        cta: string;
        steps: { step: string; title: string; desc: string }[];
      }[];
    };
    modules: {
      eyebrow: string;
      title: string;
      subtitle: string;
    };
    features: {
      interview: { title: string; desc: string; chips: string[] };
      discover: { title: string; desc: string; chips: string[] };
      resumeReview: { title: string; desc: string; chips: string[] };
      tracking: { title: string; desc: string; chips: string[] };
      cards: { title: string; desc: string; chips: string[] };
      diagnostic: { title: string; desc: string; chips: string[] };
    };
    pillars: {
      eyebrow: string;
      title: string;
      subtitle: string;
      personal: {
        label: string;
        desc: string;
        items: { title: string; desc: string }[];
      };
      org: {
        label: string;
        desc: string;
        items: { title: string; desc: string }[];
      };
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
      pricing: string;
    };
    socialProof: {
      eyebrow: string;
      stats: { value: string; label: string }[];
      orgs: string[];
      orgsMore: string;
    };
    segments: {
      eyebrow: string;
      title: string;
      subtitle: string;
      items: {
        icon: "university" | "company" | "student";
        title: string;
        desc: string;
        href: string;
      }[];
    };
    updates: {
      eyebrow: string;
      title: string;
      items: { badge: string; title: string; desc: string }[];
    };
    faq: {
      eyebrow: string;
      title: string;
      items: { q: string; a: string }[];
    };
  };
  products: {
    hub: {
      eyebrow: string;
      title: string;
      subtitle: string;
      personalLabel: string;
      orgLabel: string;
      closingTitle: string;
      ctaPersonal: string;
      ctaOrg: string;
    };
    common: {
      hub: string;
      related: string;
      learnMore: string;
    };
    pages: Record<
      | "discover"
      | "resume"
      | "interview"
      | "practice"
      | "growth"
      | "diagnostic"
      | "organizations",
      {
        eyebrow: string;
        headline: string;
        subtitle: string;
        highlights: { title: string; desc: string }[];
        capabilitiesTitle: string;
        capabilities: string[];
        ctaPrimary: string;
        ctaSecondaryLabel?: string;
        ctaSecondaryHref?: string;
        closingTitle: string;
      }
    >;
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
    pageTitle: string;
    pageSubtitle: string;
    competencySection: string;
    differentiation: {
      title: string;
      items: string[];
      link: string;
    };
    stats: {
      careerLevel: string;
      sessions: string;
      avgPercentile: string;
      avgPercentileBasis: string;
      strongest: string;
      improve: string;
      skillTree: string;
      radar: string;
      radarEmpty: string;
      radarMeasuredCount: string;
      growth: string;
      growthEmpty: string;
      growthTrendHint: string;
      strengthDeckNote: string;
      onboarding: {
        title: string;
        subtitle: string;
        ctaInterview: string;
        ctaTrial: string;
        skillTreeHint: string;
      };
      dimensionTrend: {
        title: string;
        timeSeriesTitle: string;
        timeSeriesHint: string;
        timeSeriesEmpty: string;
        comparison: string;
        comparisonEmpty: string;
        recentLegend: string;
        previousLegend: string;
        empty: string;
      };
    };
    coachInsights: {
      sectionTitle: string;
      masteryTitle: string;
      masteryHint: string;
      dimensionsTitle: string;
      dimensionsHint: string;
      dimensionsEmpty: string;
      roundsTitle: string;
      roundsEmpty: string;
      accessTitle: string;
      accessHint: string;
      view: string;
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
      imageOcrSuccess: string;
      manual: string;
      viewEdit: string;
      collapse: string;
      remove: string;
      charsApplied: string;
      placeholder: string;
      analyzeCta: string;
      analyzing: string;
      needMoreChars: string;
    };
    job: { title: string };
    persona: { eyebrow: string };
    competency: {
      title: string;
      hint: string;
      plan: string;
      recommended: string;
      done: string;
      inProgress: string;
      notStarted: string;
      multiSessionHint: string;
      multiSessionHintOne: string;
    };
    prepMode: { title: string; hint: string; competencySet: string; companyTarget: string };
    timeBudget: { title: string; hint: string; unit: string; perCompetency: string };
    questionCount: { title: string; hint: string; unit: string };
    resume: {
      title: string;
      hint: string;
      upload: string;
      parsing: string;
      manual: string;
      viewEdit: string;
      collapse: string;
      remove: string;
      charsApplied: string;
      placeholder: string;
    };
    resumeReview: { button: string; preparing: string; needResume: string; needIndustry: string };
    start: string;
    preparing: string;
    selectIndustry: string;
    selectCompetency: string;
    companySizes: Record<string, string>;
    tripleFeedback: { title: string; hint: string };
    jdBonus: { title: string; hint: string };
    resumeClaim: { title: string; hint: string };
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
