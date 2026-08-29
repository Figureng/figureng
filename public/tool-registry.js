/*
 * FigureNG Tool Registry
 *
 * This is the single source of truth for public tools.
 * The homepage, tools directory, search and category navigation
 * all read this file. When a new tool is built, add ONE entry here.
 */

window.FIGURENG_TOOLS = [
  {
    name: "Nigeria Salary Calculator 2026",
    slug: "salary-calculator",
    url: "/salary-calculator.html",
    category: "Salary & PAYE",
    description: "Estimate Nigerian PAYE, deductions and monthly take-home pay.",
    keywords: "salary take home pay PAYE net gross income tax",
    icon: "💵",
    featured: true,
    order: 1
  },
  {
    name: "Salary Increase Calculator",
    slug: "salary-increase-calculator",
    url: "/salary-increase-calculator.html",
    category: "Salary & PAYE",
    description: "See how a salary increase changes your monthly and annual income.",
    keywords: "salary raise increment increase new salary percentage",
    icon: "📈",
    featured: true,
    order: 2
  },
  {
    name: "Loan Calculator",
    slug: "loan-calculator",
    url: "/loan-calculator.html",
    category: "Loans & Debt",
    description: "Estimate monthly repayments, total interest and borrowing costs.",
    keywords: "loan repayment interest borrowing debt monthly payment",
    icon: "💳",
    featured: true,
    order: 3
  },
  {
    name: "Flat vs Reducing Balance Calculator",
    slug: "flat-vs-reducing",
    url: "/flat-vs-reducing.html",
    category: "Loans & Debt",
    description: "Compare flat-rate and reducing-balance loan costs side by side.",
    keywords: "flat rate reducing balance loan interest comparison",
    icon: "⚖️",
    featured: false,
    order: 4
  },
  {
    name: "VAT Calculator",
    slug: "vat-calculator",
    url: "/vat-calculator.html",
    category: "Tax",
    description: "Calculate VAT, pre-tax amounts and totals for Nigerian transactions.",
    keywords: "VAT tax value added tax price inclusive exclusive",
    icon: "🧾",
    featured: true,
    order: 5
  },
  {
    name: "Fuel Cost Calculator",
    slug: "fuel-cost-calculator",
    url: "/fuel-cost-calculator.html",
    category: "Everyday Costs",
    description: "Estimate trip fuel costs from distance, fuel use and petrol price.",
    keywords: "fuel petrol transport trip cost distance consumption",
    icon: "⛽",
    featured: true,
    order: 6
  },
  {
    name: "Electricity Bill Calculator",
    slug: "electricity-bill-calculator",
    url: "/electricity-bill-calculator.html",
    category: "Everyday Costs",
    description: "Estimate electricity usage and your expected household bill.",
    keywords: "electricity power bill energy units tariff NEPA AEDC EKEDC",
    icon: "⚡",
    featured: true,
    order: 7
  }
];

window.FIGURENG_CATEGORIES = [
  {
    name: "Salary & PAYE",
    description: "Understand earnings, deductions and take-home pay.",
    icon: "💰",
    order: 1
  },
  {
    name: "Tax",
    description: "Useful calculators for Nigerian taxes and charges.",
    icon: "🧾",
    order: 2
  },
  {
    name: "Loans & Debt",
    description: "Compare borrowing costs and repayment options.",
    icon: "🏦",
    order: 3
  },
  {
    name: "Everyday Costs",
    description: "Calculate everyday expenses before you spend.",
    icon: "🧮",
    order: 4
  }
];

/* Helpers shared by FigureNG pages. */
window.FigureNGTools = {
  all: function () {
    return window.FIGURENG_TOOLS.slice().sort(function (a, b) {
      return (a.order || 999) - (b.order || 999);
    });
  },

  categories: function () {
    return window.FIGURENG_CATEGORIES.slice().sort(function (a, b) {
      return (a.order || 999) - (b.order || 999);
    });
  },

  byCategory: function (category) {
    return this.all().filter(function (tool) {
      return tool.category === category;
    });
  },

  find: function (slug) {
    return this.all().find(function (tool) {
      return tool.slug === slug;
    }) || null;
  }
};
