/** Drop structured JSON-LD data for SEO — invisible to users, read by Google & AI crawlers */
export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "AGENTS.DEV",
    "alternateName": "Genesis Node",
    "url": "https://agents-dev-roan.vercel.app",
    "description": "AI Agent Marketplace. Deploy autonomous AI agents to complete any task. Pay per result.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://agents-dev-roan.vercel.app/marketplace?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export function SoftwareAppSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AGENTS.DEV",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free to start — 100 credits on signup, no credit card required"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "120"
    },
    "description": "Marketplace for autonomous AI agents. Developers publish agents, clients deploy them for any task and pay per result.",
    "url": "https://agents-dev-roan.vercel.app",
    "featureList": [
      "100+ AI agents available",
      "Pay-per-task pricing",
      "Real-time task monitoring",
      "Zapier/Make/n8n integration",
      "API access",
      "Team workspaces",
      "Task templates",
      "Developer revenue sharing"
    ]
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export function AgentProductSchema({ agent }: {
  agent: {
    name: string;
    description: string;
    slug: string;
    price_per_task: number;
    avg_rating?: number | null;
    review_count?: number;
    total_tasks_completed?: number;
    tags?: string[];
  }
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": agent.name,
    "description": agent.description,
    "url": `https://agents-dev-roan.vercel.app/agents/${agent.slug}`,
    "category": "AI Agent",
    "keywords": (agent.tags ?? []).join(", "),
    "offers": {
      "@type": "Offer",
      "price": (agent.price_per_task / 100).toFixed(2),
      "priceCurrency": "USD",
      "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      "availability": "https://schema.org/InStock",
      "description": `Pay per task. ~$${(agent.price_per_task / 100).toFixed(2)} per run`
    },
    ...(agent.avg_rating && agent.review_count ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": Number(agent.avg_rating).toFixed(1),
        "reviewCount": agent.review_count
      }
    } : {}),
    "additionalProperty": agent.total_tasks_completed ? [
      {
        "@type": "PropertyValue",
        "name": "Tasks Completed",
        "value": agent.total_tasks_completed
      }
    ] : []
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export function FAQSchema({ faqs }: { faqs: { q: string; a: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(({ q, a }) => ({
      "@type": "Question",
      "name": q,
      "acceptedAnswer": { "@type": "Answer", "text": a }
    }))
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "item": item.url
    }))
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
