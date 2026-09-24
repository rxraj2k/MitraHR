// Seeds the "DevOps Engineering" Learning Center tab's assignable course
// catalog (all Udemy course links from the DevOps learning brief) — run
// once from apps/api:
//   npx ts-node prisma/seed-devops-courses.ts
//
// Safe to re-run: same upsert-by-title approach as seed-iam-courses.ts.
//
// Note: "Microsoft Entra ID (formerly Azure AD) administration course" is
// deliberately NOT in this list — it's the exact same Udemy course already
// seeded under IAM Engineering (IAM_UDEMY). Re-adding it here under a
// different category would silently move it out of the IAM tab. Assign it
// to DevOps engineers straight from the IAM Engineering tab if needed;
// nothing stops a course from being assigned to someone outside its own
// category's usual audience.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedCourse {
  title: string;
  category: 'DEVOPS_UDEMY';
  url: string;
  description?: string;
}

const COURSES: SeedCourse[] = [
  // --- Agile / Project Management ---
  { title: 'Agile Fundamentals: Including Scrum & Kanban', category: 'DEVOPS_UDEMY', url: 'https://www.udemy.com/course/agile-fundamentals-scrum-kanban-scrumban/?couponCode=KEEPLEARNING' },
  {
    title: 'Kanban AI Fundamentals: Learn How to Become More Productive',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/draft/5747374/learn/lecture/41644722#overview',
  },

  // --- Containers / Docker ---
  { title: 'Containers 101', category: 'DEVOPS_UDEMY', url: 'https://www.udemy.com/course/containers-101/?src=sac&kw=Containers+101' },
  { title: 'Docker for the Absolute Beginner - Hands On - DevOps', category: 'DEVOPS_UDEMY', url: 'https://www.udemy.com/course/learn-docker/' },

  // --- Kubernetes: Foundations ---
  { title: 'Kubernetes for the Absolute Beginners - Hands-on', category: 'DEVOPS_UDEMY', url: 'https://www.udemy.com/course/learn-kubernetes/?couponCode=KEEPLEARNING' },
  { title: 'Docker and Kubernetes: The Complete Guide', category: 'DEVOPS_UDEMY', url: 'https://www.udemy.com/course/docker-and-kubernetes-the-complete-guide/' },
  { title: 'Docker & Kubernetes: The Complete Practical Guide', category: 'DEVOPS_UDEMY', url: 'https://www.udemy.com/course/docker-complete/?couponCode=KEEPLEARNING' },
  { title: 'Practical Kubernetes Guide', category: 'DEVOPS_UDEMY', url: 'https://www.udemy.com/course/kubernetes-best-practices/' },

  // --- Kubernetes: Package Management ---
  { title: 'HELM MasterClass: Kubernetes Packaging Manager', category: 'DEVOPS_UDEMY', url: 'https://www.udemy.com/course/helm-kubernetes/?couponCode=KEEPLEARNING' },
  { title: 'Helm Lightning Course', category: 'DEVOPS_UDEMY', url: 'https://www.udemy.com/course/helm-lightning-course/' },

  // --- Kubernetes: Cloud-Native (IaC) ---
  {
    title: 'GCP GKE Terraform on Google Kubernetes Engine DevOps SRE IaC',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/gcp-gke-terraform-on-google-kubernetes-engine-devops-sre-iac/?couponCode=KEEPLEARNING',
  },

  // --- Kubernetes: Certifications ---
  {
    title: 'Certified Kubernetes Administrator (CKA) with Practice Tests',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/certified-kubernetes-administrator-with-practice-tests/',
  },
  {
    title: 'Certified Kubernetes Security Specialist (CKS)',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/certified-kubernetes-security-specialist-cks-exam/?couponCode=KEEPLEARNING',
  },

  // --- CI/CD: Version Control ---
  { title: 'The Git & GitHub Bootcamp', category: 'DEVOPS_UDEMY', url: 'https://www.udemy.com/course/git-and-github-bootcamp/?couponCode=KEEPLEARNING' },

  // --- CI/CD: Tools & Pipelines ---
  { title: 'GitHub Actions - The Complete Guide', category: 'DEVOPS_UDEMY', url: 'https://www.udemy.com/course/github-actions-the-complete-guide/?couponCode=KEEPLEARNING' },
  {
    title: 'GitLab CI - A Complete Hands-On for CI/CD Pipelines & DevOps',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/gitlab-cicd-course/?couponCode=KEEPLEARNING',
  },
  {
    title: 'Atlassian Bamboo Data Center from Beginner to Advanced',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/bamboo-continuous-integration-for-devops-developers/?couponCode=KEEPLEARNING',
  },
  { title: 'Azure DevOps Bootcamp: Zero to Hero (Pipelines, Boards, Repos)', category: 'DEVOPS_UDEMY', url: 'https://www.udemy.com/course/azdevops/' },

  // --- CI/CD: GitOps / Continuous Delivery ---
  {
    title: 'Argo CD Essential Guide for End Users with Practice',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/argo-cd-essential-guide-for-end-users-with-practice/',
  },

  // --- CI/CD: Site Reliability Engineering ---
  {
    title: 'Production Support - Site Reliability Engineer',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/production-site-reliability-engineer/?couponCode=KEEPLEARNING',
  },
  {
    title: 'SRE Fundamentals: Mastering Site Reliability Engineering',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/sre-fundamentals-mastering-site-reliability-engineering/?couponCode=KEEPLEARNING',
  },

  // --- CI/CD: DevSecOps ---
  { title: 'DevSecOps Fundamentals - Including Hands-On Demos', category: 'DEVOPS_UDEMY', url: 'https://www.udemy.com/course/devsecops-fundamentals/?couponCode=KEEPLEARNING' },
  {
    title: 'DevSecOps Mastery with Docker and Kubernetes',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/containerization-with-docker-and-kubernetes-mastery/?couponCode=KEEPLEARNING',
  },

  // --- CI/CD: Cloud Certifications ---
  {
    title: 'Google Certified Professional Cloud DevOps Engineer Exam',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/draft/5762062/learn/quiz/6187576#overview',
  },

  // --- Programming / Scripting ---
  {
    title: 'Python in Action: A Practical Course 50+ Real-World Projects',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/python-in-action-a-practical-course-50-real-world-projects/?couponCode=KEEPLEARNING',
  },
  { title: 'Batch Script Programming Crash Course (CMD)', category: 'DEVOPS_UDEMY', url: 'https://www.udemy.com/course/batch-script-programming/' },

  // --- Terraform ---
  { title: 'Deploy Infra in the Cloud using Terraform', category: 'DEVOPS_UDEMY', url: 'https://www.udemy.com/course/deploy-infra-in-the-cloud-using-terraform/?couponCode=KEEPLEARNING' },
  {
    title: 'Terraform Associate Certification Practice Exam',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/draft/5804536/learn/quiz/6223480/results?expanded=1767843857#overview',
  },
  {
    title: 'Terraform on AWS with SRE & IaC DevOps | Real-World 20 Demos',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/terraform-on-aws-with-sre-iac-devops-real-world-demos/',
  },
  {
    title: 'AWS DevOps: ElasticSearch at AWS with Terraform and Ansible',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/aws-devops-elasticsearch-at-aws-with-terraform-and-ansible/?couponCode=KEEPLEARNING',
  },
  { title: "Let's Learn Terraform in GCP", category: 'DEVOPS_UDEMY', url: 'https://www.udemy.com/course/lets-learn-terraform-in-gcp/?couponCode=KEEPLEARNING' },

  // --- Monitoring ---
  { title: 'Prometheus | The Complete Hands-On for Monitoring & Alerting', category: 'DEVOPS_UDEMY', url: 'https://www.udemy.com/course/prometheus-course/?couponCode=KEEPLEARNING' },
  {
    title: 'Datadog: Performance Monitoring Tool (from Zero to Hero)',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/datadog-performance-monitoring-tool-from-zero-to-hero/',
  },
  { title: 'Splunk Basics Course', category: 'DEVOPS_UDEMY', url: 'https://www.udemy.com/course/splunk-basics-course/' },
  {
    title: 'Getting Started with Wireshark: The Ultimate Hands-On Course',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/wireshark-ultimate-hands-on-course/',
  },

  // --- Cloud: AWS ---
  {
    title: 'AWS Lambda & Serverless - Developer Guide with Hands-on Labs',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/aws-lambda-serverless-developer-guide-with-hands-on-labs/',
  },
  {
    title: 'Ultimate AWS Certified Solutions Architect Associate 2025',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/aws-certified-solutions-architect-associate-saa-c03/?couponCode=KEEPLEARNING',
  },

  // --- Cloud: GCP ---
  {
    title: 'GCP - Google Cloud Professional Data Engineer Certification',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/google-cloud-gcp-professional-data-engineer-certification/?couponCode=KEEPLEARNING',
  },
  {
    title: 'GCP Associate Cloud Engineer - Google Cloud Certification',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/google-cloud-certification-associate-cloud-engineer/',
  },
  {
    title: 'GCP Professional Cloud Architect Practice Questions',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/draft/5790048/learn/quiz/6208522#overview',
  },
  {
    title: 'Google Cloud - Associate Cloud Engineer Practice Exam',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/google-cloud-associate-cloud-engineer-practice-exam/learn/quiz/6043068#overview',
  },

  // --- Secret Management ---
  {
    title: 'HashiCorp Certified: Vault Associate (w/ Hands-On Labs)',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/hashicorp-vault/?couponCode=KEEPLEARNING',
  },

  // --- Data / Analytics ---
  {
    title: 'Dynamic Dashboards and Data Analysis with Looker Studio',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/dynamic-dashboards-and-data-analysis-with-google-data-studio/?couponCode=KEEPLEARNING',
  },
  {
    title: 'Elasticsearch 8 and the Elastic Stack: In Depth and Hands On',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/elasticsearch-and-elastic-stack/?couponCode=KEEPLEARNING',
  },
  {
    title: 'Google BigQuery Foundation for Data Engineering | Beginners',
    category: 'DEVOPS_UDEMY',
    url: 'https://www.udemy.com/course/google-bigquery-foundation-big-data-cloud-engineer/',
  },
];

async function main() {
  for (const c of COURSES) {
    const existing = await prisma.trainingCourse.findUnique({ where: { title: c.title } });
    if (existing) {
      await prisma.trainingResource.deleteMany({ where: { courseId: existing.id } });
      await prisma.trainingCourse.update({
        where: { id: existing.id },
        data: {
          category: c.category,
          description: c.description ?? null,
          resources: { create: [{ url: c.url, order: 0 }] },
        },
      });
      console.log(`Updated: ${c.title}`);
    } else {
      await prisma.trainingCourse.create({
        data: {
          title: c.title,
          category: c.category,
          description: c.description,
          resources: { create: [{ url: c.url, order: 0 }] },
        },
      });
      console.log(`Created: ${c.title}`);
    }
  }
  console.log(`\nDone — ${COURSES.length} DevOps Engineering courses seeded.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
