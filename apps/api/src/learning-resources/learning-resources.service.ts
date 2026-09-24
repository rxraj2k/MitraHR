import { Injectable } from '@nestjs/common';

// Handwritten reference content, not database rows — portal credentials and
// the IAM tool glossary aren't "courses" someone completes (no per-employee
// assignment/progress makes sense for "what is SCIM"), so they don't belong
// in TrainingCourse. They live here as plain data instead, gated behind the
// same JwtAuthGuard as /training/my — any signed-in employee can read them,
// same as their own assigned training, since these credentials exist for
// them to actually use to log in and learn. Keeping this out of the web
// bundle (unlike a frontend constant) is the whole point: it's only ever
// served over an authenticated API call, never shipped to a browser that
// hasn't logged in.
//
// track: 'IAM' today; 'DEVOPS' gets its own portals/reference once that
// tab's material comes in — same shape, new entries below.

export interface LearningPortalData {
  id: string;
  track: 'IAM' | 'DEVOPS';
  name: string;
  websiteUrl: string;
  loginUrl?: string;
  username: string;
  passwordNote: string;
  notes?: string[];
}

export interface LearningReferenceLinkData {
  label: string;
  url: string;
}

export interface LearningReferenceToolData {
  name: string;
  links: LearningReferenceLinkData[];
}

export interface LearningReferenceGroupData {
  key: string;
  track: 'IAM' | 'DEVOPS';
  title: string;
  tools: LearningReferenceToolData[];
}

const IAM_PORTALS: LearningPortalData[] = [
  {
    id: 'udemy',
    track: 'IAM',
    name: 'Udemy',
    websiteUrl: 'https://www.udemy.com/',
    loginUrl: 'https://www.udemy.com/join/login-popup/?passwordredirect=True',
    username: 'offshoremitra@gmail.com',
    passwordNote: 'You will receive the OTP on your office email during login (passwordless sign-in).',
    notes: [
      'Use office email access for OTP verification.',
      'Check the Notifications and Newsletter folders if the OTP email is not in your inbox.',
      'OTP can take up to a minute to arrive — wait before requesting a new one.',
      'Do not share credentials outside the organization.',
    ],
  },
  {
    id: 'cloudfoundation',
    track: 'IAM',
    name: 'CloudFoundation',
    websiteUrl: 'https://lms.cloudfoundation.com/',
    username: 'tosanjaysaraf@gmail.com',
    passwordNote: 'b7iD4U6Yj22i#',
    notes: ['Call Sanjay for MFA/OTP.'],
  },
  {
    id: 'secapps-sailpoint',
    track: 'IAM',
    name: 'SecApps Learning (SailPoint & Saviynt)',
    websiteUrl: 'https://secappslearning.com',
    username: 'offshoremitra@gmail.com',
    passwordNote: 'Matrix123#',
    notes: ['If you have access issues on the ISC (IdentityNow) course specifically, call Sanjay directly.'],
  },
  {
    id: 'secapps-cyberark',
    track: 'IAM',
    name: 'SecApps Learning (CyberArk)',
    websiteUrl: 'https://secappslearning.com',
    username: 'ishubhamrb29@gmail.com',
    passwordNote: 'Matrix123#',
  },
];

// Same shared Udemy account as IAM Engineering — repeated here (own id) so
// it shows up under this tab too without staff having to remember it lives
// under IAM Engineering.
const DEVOPS_PORTALS: LearningPortalData[] = [
  {
    id: 'udemy-devops',
    track: 'DEVOPS',
    name: 'Udemy',
    websiteUrl: 'https://www.udemy.com/',
    loginUrl: 'https://www.udemy.com/join/login-popup/?passwordredirect=True',
    username: 'offshoremitra@gmail.com',
    passwordNote: 'You will receive the OTP on your office email during login (passwordless sign-in).',
    notes: [
      'Use office email access for OTP verification.',
      'Check the Notifications and Newsletter folders if the OTP email is not in your inbox.',
      'OTP can take up to a minute to arrive — wait before requesting a new one.',
      'Do not share credentials outside the organization.',
    ],
  },
];

const IAM_REFERENCE_GROUPS: LearningReferenceGroupData[] = [
  {
    key: 'iga',
    track: 'IAM',
    title: 'IGA',
    tools: [
      {
        name: 'SailPoint IIQ (IdentityIQ)',
        links: [
          { label: 'SailPoint Documentation', url: 'https://documentation.sailpoint.com/identityiq/help/index.html' },
          {
            label: 'Confluence',
            url: 'https://offshoreitmitra.atlassian.net/wiki/spaces/~6290b0a8f2ee4a0069e18ebc/folder/244580353?atlOrigin=eyJpIjoiYzczNWIyODJiNDk5NDYxYWI4ZTExZDllZTZhNzIwZGQiLCJwIjoiYyJ9',
          },
          { label: 'GitHub Repo (Setup)', url: 'https://github.com/Offshore-Mitra/sailpoint-iiq?utm_source=chatgpt.com' },
          { label: 'SailPoint Self-Paced Full Training', url: 'https://secappslearning.com/course/sailpoint-self-paced-full-training' },
          { label: 'Google Drive', url: 'https://drive.google.com/drive/folders/19eXWFUWR7V3zNEOA-6-Xr1eDNx4bevt4' },
        ],
      },
      {
        name: 'SailPoint IDN (Identity Now)',
        links: [
          { label: 'Intro', url: 'https://www.youtube.com/watch?v=Q7JRSosPdzc' },
          { label: 'YouTube Playlist', url: 'https://www.youtube.com/playlist?list=PL-h7qqtoVN10ljzPHRTKLnWDnwtHz0ZK6' },
          { label: 'SailPoint ISC recorded', url: 'https://drive.google.com/file/d/1ZzJ9JlSsOz8zZtoLubKGoMMVDbi9lcnE/view?usp=drive_link' },
          {
            label: 'SailPoint ISC YouTube Playlist',
            url: 'https://youtube.com/playlist?list=PLci-so1hx-o-D89KCej8Qn-viDvuIzyxc&si=sEcEHpUXiY4MD1bD',
          },
          { label: 'IDN/ISC from SecApps', url: 'https://web.secappslearning.com/store/course/674220/0?section=content' },
          {
            label: 'Provision Users from Microsoft Entra',
            url: 'https://www.youtube.com/watch?v=PasCvHHQtFc',
          },
        ],
      },
      {
        name: 'Saviynt (Identity Governance and Administration)',
        links: [
          {
            label: 'Saviynt IAM Self-Paced Online Training',
            url: 'https://secappslearning.com/usercoursedetails/?url=saviynt-iam-self-paced-online-training&course=course2643',
          },
          {
            label: 'Confluence',
            url: 'https://offshoreitmitra.atlassian.net/wiki/spaces/~6290b0a8f2ee4a0069e18ebc/folder/262668289?atlOrigin=eyJpIjoiYThlYWZkZjlkNTRkNDZmMGFmOTBkMmJlOWE4NDJkNTEiLCJwIjoiYyJ9',
          },
        ],
      },
    ],
  },
  {
    key: 'access-management',
    track: 'IAM',
    title: 'Access Management',
    tools: [
      {
        name: 'Okta',
        links: [
          { label: 'Okta Course', url: 'https://learning.cloudfoundation.com/courses/2420821/lectures/50991309' },
          { label: 'Udemy', url: 'https://www.udemy.com/course/okta-course/' },
          {
            label: 'Confluence',
            url: 'https://offshoreitmitra.atlassian.net/wiki/spaces/~6290b0a8f2ee4a0069e18ebc/pages/392527873/Okta?atlOrigin=eyJpIjoiNjY1Yjc1ZTBkYjJlNDVlNGE3NDZlZjYzYTI4ZGExMDMiLCJwIjoiYyJ9',
          },
        ],
      },
      {
        name: 'PingFederate',
        links: [
          { label: 'PingFederate Course', url: 'https://learning.cloudfoundation.com/courses/2097750/' },
          {
            label: 'Confluence',
            url: 'https://offshoreitmitra.atlassian.net/wiki/spaces/~6290b0a8f2ee4a0069e18ebc/folder/411664385?atlOrigin=eyJpIjoiNjRmNGRiNjk1NzYzNGVhZGJlZGFkMmJjMGU4OWRjOTQiLCJwIjoiYyJ9',
          },
        ],
      },
      {
        name: 'Entra ID',
        links: [
          { label: 'Entra ID Documentation', url: 'https://learn.microsoft.com/en-us/entra/identity/' },
          {
            label: 'Confluence',
            url: 'https://offshoreitmitra.atlassian.net/wiki/spaces/~6290b0a8f2ee4a0069e18ebc/folder/356286467?atlOrigin=eyJpIjoiZjgyMzBhNzU0YmU0NDQ2Zjk2N2ZkOTkzOTRkNTYyNDQiLCJwIjoiYyJ9',
          },
          { label: 'Google Drive', url: 'https://drive.google.com/drive/folders/100IpfUxuXMe5_Czw1lDKNCtTuObPcALj?usp=drive_link' },
          { label: 'Udemy', url: 'https://www.udemy.com/course/azureadcourse/' },
          {
            label: 'SecApps Learning (login: tosanjaysaraf@gmail.com — call Sanjay for OTP)',
            url: 'https://web.secappslearning.com/store/course/721390?section=overview&region=IN',
          },
        ],
      },
      {
        name: 'ForgeRock AM',
        links: [
          { label: 'OpenAM Udemy Part 1', url: 'https://www.udemy.com/course/iamopenam-part1/' },
          { label: 'OpenAM Udemy Part 2', url: 'https://www.udemy.com/course/iam-accessmanager-part-2/' },
        ],
      },
      {
        name: 'ForgeRock OpenIDM',
        links: [{ label: 'OpenIDM Udemy', url: 'https://www.udemy.com/course/identity-and-access-management-forerock-openidm-653/' }],
      },
      { name: 'SiteMinder', links: [] },
    ],
  },
  {
    key: 'pam',
    track: 'IAM',
    title: 'PAM',
    tools: [
      {
        name: 'CyberArk',
        links: [
          {
            label: 'Confluence',
            url: 'https://offshoreitmitra.atlassian.net/wiki/spaces/~6290b0a8f2ee4a0069e18ebc/folder/252051457?atlOrigin=eyJpIjoiZmNiOTJhOTYyM2E0NGNhMjk0Y2YyNGMzOTBiZjVlYmQiLCJwIjoiYyJ9',
          },
          { label: 'CyberArk Full Training (SecApps)', url: 'https://secappslearning.com/usercoursedetails/?url=cyberark-full-training&course=course7887' },
          {
            label: 'PAM with CyberArk (Udemy)',
            url: 'https://www.udemy.com/course/privileged-access-management-pam/',
          },
          {
            label: 'CyberArk Certification Guidelines (Udemy)',
            url: 'https://www.udemy.com/course/cyberark-certification-with-iam-pam-guidelines-mastery/',
          },
        ],
      },
      {
        name: 'BeyondTrust',
        links: [
          { label: 'PAM Training Series (YouTube Playlist)', url: 'https://www.youtube.com/playlist?list=PLKlBtfxLOk5Egro62vMuzLkfdopyh7I_n' },
          { label: 'Google Drive', url: 'https://drive.google.com/drive/folders/1Uzbgs9yOa3M_nWutk_J69cVzclYooCQS?usp=drive_link' },
          { label: 'YouTube Playlist (alt)', url: 'https://youtube.com/playlist?list=PLQIzfWNiDhLg&si=9aA8BWHDP4fBHrFO' },
        ],
      },
    ],
  },
  {
    key: 'directories',
    track: 'IAM',
    title: 'Directories',
    tools: [
      { name: 'OpenLDAP', links: [{ label: 'OpenLDAP Documentation', url: 'https://www.openldap.org/doc/admin26/intro.html#What%20is%20LDAP' }] },
      {
        name: 'AD (Active Directory)',
        links: [
          {
            label: 'AD Documentation',
            url: 'https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/active-directory-overview',
          },
          { label: 'Google Drive', url: 'https://drive.google.com/drive/folders/1pt1-z9FNQs02NuijcdoAl2-AmdT8gJDH?usp=drive_link' },
          {
            label: 'Confluence',
            url: 'https://offshoreitmitra.atlassian.net/wiki/spaces/~6290b0a8f2ee4a0069e18ebc/folder/429162497?atlOrigin=eyJpIjoiNTk2ZjIwYzQ0MTE1NDkwNjgyMWJiZjk3ZGUxYzUwYTUiLCJwIjoiYyJ9',
          },
          { label: 'Udemy', url: 'https://www.udemy.com/share/101YnO3@4kFEusc-VdAI_qShMQH9VIPNXiS11Bd5pd1gVgnBzEfPOEcnd-dkpPvlTuK4lioA3w==/' },
        ],
      },
      { name: 'Azure AD (legacy name for Entra ID)', links: [] },
      { name: 'ForgeRock DS', links: [] },
    ],
  },
  {
    key: 'protocols',
    track: 'IAM',
    title: 'Protocols',
    tools: [
      { name: 'SAML (Security Assertion Markup Language)', links: [{ label: 'SAML Documentation', url: 'https://developer.okta.com/docs/concepts/saml/' }] },
      { name: 'OAuth 2.0 (Open Authorization)', links: [{ label: 'OAuth Documentation', url: 'https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols' }] },
      { name: 'OAuth 2.0 and OpenID Connect', links: [{ label: 'YouTube Playlist', url: 'https://www.youtube.com/watch?v=996OiexHze0' }] },
      {
        name: 'OIDC (OpenID Connect)',
        links: [{ label: 'OIDC Documentation', url: 'https://www.microsoft.com/en-us/security/business/security-101/what-is-openid-connect-oidc' }],
      },
      { name: 'LDAP (Lightweight Directory Access Protocol)', links: [{ label: 'LDAP Documentation', url: 'https://learn.microsoft.com/en-us/previous-versions/windows/desktop/ldap/about-the-ldap-api' }] },
      { name: 'SCIM (System for Cross-domain Identity Management)', links: [{ label: 'SCIM Documentation', url: 'https://developer.okta.com/docs/concepts/scim/' }] },
      { name: 'Kerberos', links: [{ label: 'Kerberos Documentation', url: 'https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview' }] },
      { name: 'RADIUS', links: [{ label: 'RADIUS Documentation', url: 'https://www.fortinet.com/resources/cyberglossary/radius-protocol' }] },
    ],
  },
  {
    key: 'authentication',
    track: 'IAM',
    title: 'Authentication',
    tools: [
      { name: 'MFA (Multi-Factor Authentication)', links: [] },
      { name: 'FIDO2 (Fast IDentity Online 2)', links: [] },
    ],
  },
  {
    key: 'access-models',
    track: 'IAM',
    title: 'Access Models',
    tools: [
      { name: 'RBAC (Role Based Access Control)', links: [{ label: 'RBAC Documentation', url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/overview' }] },
      {
        name: 'ABAC (Attribute Based Access Control)',
        links: [{ label: 'ABAC Documentation', url: 'https://learn.microsoft.com/en-us/azure/role-based-access-control/conditions-overview' }],
      },
      { name: 'PBAC (Policy Based Access Control)', links: [{ label: 'PBAC Documentation', url: 'https://csrc.nist.gov/glossary/term/policy_based_access_control' }] },
    ],
  },
  {
    key: 'cloud-iam',
    track: 'IAM',
    title: 'Cloud IAM',
    tools: [
      { name: 'AWS IAM', links: [] },
      { name: 'Azure IAM', links: [] },
      { name: 'GCP IAM', links: [] },
    ],
  },
  {
    key: 'governance-concepts',
    track: 'IAM',
    title: 'Identity Governance Concepts',
    tools: [
      { name: 'Joiner / Mover / Leaver', links: [] },
      { name: 'Access Certification', links: [] },
      { name: 'SoD (Segregation of Duties)', links: [] },
      { name: 'Birthright Access', links: [] },
      { name: 'Role Mining', links: [] },
    ],
  },
  {
    key: 'provisioning',
    track: 'IAM',
    title: 'Provisioning',
    tools: [
      { name: 'Provisioning / Deprovisioning', links: [] },
      {
        name: 'JIT Provisioning (Just In Time)',
        links: [
          {
            label: 'Confluence',
            url: 'https://offshoreitmitra.atlassian.net/wiki/spaces/~6290b0a8f2ee4a0069e18ebc/pages/406978561/JIT+Configuration',
          },
        ],
      },
      { name: 'API Provisioning', links: [] },
    ],
  },
  {
    key: 'security-concepts',
    track: 'IAM',
    title: 'Security Concepts',
    tools: [
      {
        name: 'Zero Trust Architecture',
        links: [
          {
            label: 'Confluence',
            url: 'https://offshoreitmitra.atlassian.net/wiki/spaces/~6290b0a8f2ee4a0069e18ebc/pages/305528833/Zero+Trust+Security+Framework+The+Modern+Security+Paradigm?atlOrigin=eyJpIjoiNGU2YTgzYzc5YzAyNDNkN2IwNmVhMjhlYmQzOTYyNzIiLCJwIjoiYyJ9',
          },
        ],
      },
    ],
  },
  {
    key: 'additional-learning',
    track: 'IAM',
    title: 'Additional Learning Recommendations',
    tools: [
      { name: 'PowerShell', links: [{ label: 'YouTube Playlist', url: 'https://www.youtube.com/watch?v=52H3pkq8XQM' }] },
      { name: 'REST APIs', links: [] },
      { name: 'Postman', links: [] },
      {
        name: 'BloodHound',
        links: [
          { label: 'YouTube Playlist 1', url: 'https://www.youtube.com/watch?v=sGO4F23Xik4' },
          { label: 'YouTube Playlist 2', url: 'https://www.youtube.com/watch?v=whTdMlJGViM' },
        ],
      },
      { name: 'PowerShell and Active Directory Essentials', links: [{ label: 'YouTube', url: 'https://www.youtube.com/watch?v=-zDXTLiX_wk' }] },
    ],
  },
];

// Non-Udemy reference material for DevOps: internal workflow docs, a couple
// of standalone videos/articles, and a "what tool covers what" glossary.
// Where a bullet below matches a real Udemy course already in the seeded
// catalog, that same link is repeated here for convenience — a bullet with
// no source link anywhere in the brief (Jenkins, Bitbucket, JFrog
// Artifactory) is left link-less rather than guessed at.
const DEVOPS_REFERENCE_GROUPS: LearningReferenceGroupData[] = [
  {
    key: 'artifact-package-management',
    track: 'DEVOPS',
    title: 'Artifact & Package Management',
    tools: [
      {
        name: 'Sonatype Nexus',
        links: [
          { label: 'Introduction to Nexus Repository Manager (overview)', url: 'https://www.youtube.com/watch?v=7nqLHJwPvmw' },
          { label: 'Learn Nexus Repository From Scratch in 2 Hours', url: 'https://www.youtube.com/watch?v=CNTLIgGGuoQ' },
        ],
      },
      {
        name: 'Workflow Examples (internal)',
        links: [
          { label: 'Basic Build Workflow (GitHub Actions)', url: 'https://offshoreitmitra.atlassian.net/wiki/x/BICjGw' },
          {
            label: 'Watson Agent Deploy Workflow',
            url: 'https://offshoreitmitra.atlassian.net/wiki/spaces/~6290b0a8f2ee4a0069e18ebc/pages/463831043/Watson+Agent+Deploy+Workflow?atlOrigin=eyJpIjoiMDcyN2U3NWJiYWI0NDk4NmJiYzYwOGYwZWY2M2NhZTkiLCJwIjoiYyJ9',
          },
          {
            label: 'YAVA FAQ Agent Deploy Workflow',
            url: 'https://offshoreitmitra.atlassian.net/wiki/spaces/~6290b0a8f2ee4a0069e18ebc/pages/464519169/YAVA+FAQ+Agent+Deploy+Workflow?atlOrigin=eyJpIjoiZTk2OGY0N2E4MDQ5NDM4MmJmMjg0ZTE1YzcwZGI3YTAiLCJwIjoiYyJ9',
          },
        ],
      },
    ],
  },
  {
    key: 'additional-resources',
    track: 'DEVOPS',
    title: 'Additional Resources',
    tools: [
      { name: 'Types of Environments in Software Development', links: [{ label: 'Video', url: 'https://youtu.be/AlUXLJtSn_c?si=5rynkNMml4Vy8nu1' }] },
      {
        name: 'Git Branching and Merging',
        links: [
          { label: 'Video 1', url: 'https://youtu.be/CwSEB0LoB74?si=WEEny3VmLHJB7nBj' },
          { label: 'Video 2', url: 'https://youtu.be/6QNgbD2m7gA?si=T0jwERGavgH6B3hX' },
        ],
      },
      {
        name: 'Branching Strategies in Git (GeeksforGeeks)',
        links: [{ label: 'Read Article', url: 'https://www.geeksforgeeks.org/git/branching-strategies-in-git/' }],
      },
    ],
  },
  {
    key: 'cicd-tools',
    track: 'DEVOPS',
    title: 'CI/CD',
    tools: [
      { name: 'Jenkins', links: [] },
      {
        name: 'GitHub Actions',
        links: [{ label: 'GitHub Actions - The Complete Guide (Udemy)', url: 'https://www.udemy.com/course/github-actions-the-complete-guide/?couponCode=KEEPLEARNING' }],
      },
      {
        name: 'GitLab CI',
        links: [{ label: 'GitLab CI Course (Udemy)', url: 'https://www.udemy.com/course/gitlab-cicd-course/?couponCode=KEEPLEARNING' }],
      },
      {
        name: 'Argo CD',
        links: [{ label: 'Argo CD Essential Guide (Udemy)', url: 'https://www.udemy.com/course/argo-cd-essential-guide-for-end-users-with-practice/' }],
      },
    ],
  },
  {
    key: 'containers',
    track: 'DEVOPS',
    title: 'Containers',
    tools: [
      {
        name: 'Docker',
        links: [{ label: 'Docker and Kubernetes: The Complete Guide (Udemy)', url: 'https://www.udemy.com/course/docker-and-kubernetes-the-complete-guide/' }],
      },
      {
        name: 'Kubernetes',
        links: [
          { label: 'CKA Certification (Udemy)', url: 'https://www.udemy.com/course/certified-kubernetes-administrator-with-practice-tests/' },
          { label: 'CKS Certification (Udemy)', url: 'https://www.udemy.com/course/certified-kubernetes-security-specialist-cks-exam/?couponCode=KEEPLEARNING' },
        ],
      },
      {
        name: 'Helm',
        links: [{ label: 'HELM MasterClass (Udemy)', url: 'https://www.udemy.com/course/helm-kubernetes/?couponCode=KEEPLEARNING' }],
      },
    ],
  },
  {
    key: 'infrastructure-as-code',
    track: 'DEVOPS',
    title: 'Infrastructure as Code',
    tools: [
      {
        name: 'Terraform',
        links: [
          { label: 'Deploy Infra in the Cloud using Terraform (Udemy)', url: 'https://www.udemy.com/course/deploy-infra-in-the-cloud-using-terraform/?couponCode=KEEPLEARNING' },
          {
            label: 'Terraform Associate Certification Practice Exam (Udemy)',
            url: 'https://www.udemy.com/course/draft/5804536/learn/quiz/6223480/results?expanded=1767843857#overview',
          },
        ],
      },
    ],
  },
  {
    key: 'monitoring-logging',
    track: 'DEVOPS',
    title: 'Monitoring & Logging',
    tools: [
      {
        name: 'Prometheus',
        links: [{ label: 'Prometheus Complete Hands-On (Udemy)', url: 'https://www.udemy.com/course/prometheus-course/?couponCode=KEEPLEARNING' }],
      },
      {
        name: 'Datadog',
        links: [{ label: 'Datadog Course (Udemy)', url: 'https://www.udemy.com/course/datadog-performance-monitoring-tool-from-zero-to-hero/' }],
      },
      { name: 'Splunk', links: [{ label: 'Splunk Basics Course (Udemy)', url: 'https://www.udemy.com/course/splunk-basics-course/' }] },
      {
        name: 'Wireshark',
        links: [{ label: 'Getting Started with Wireshark (Udemy)', url: 'https://www.udemy.com/course/wireshark-ultimate-hands-on-course/' }],
      },
    ],
  },
  {
    key: 'secret-management',
    track: 'DEVOPS',
    title: 'Secret Management',
    tools: [
      {
        name: 'HashiCorp Vault',
        links: [{ label: 'Vault Associate Certification (Udemy)', url: 'https://www.udemy.com/course/hashicorp-vault/?couponCode=KEEPLEARNING' }],
      },
    ],
  },
  {
    key: 'cloud-platforms',
    track: 'DEVOPS',
    title: 'Cloud Platforms',
    tools: [
      {
        name: 'AWS',
        links: [{ label: 'Ultimate AWS Certified Solutions Architect Associate (Udemy)', url: 'https://www.udemy.com/course/aws-certified-solutions-architect-associate-saa-c03/?couponCode=KEEPLEARNING' }],
      },
      {
        name: 'GCP',
        links: [{ label: 'GCP Associate Cloud Engineer (Udemy)', url: 'https://www.udemy.com/course/google-cloud-certification-associate-cloud-engineer/' }],
      },
      {
        name: 'Azure DevOps',
        links: [{ label: 'Azure DevOps Bootcamp: Zero to Hero (Udemy)', url: 'https://www.udemy.com/course/azdevops/' }],
      },
    ],
  },
  {
    key: 'repositories',
    track: 'DEVOPS',
    title: 'Repositories',
    tools: [
      { name: 'GitHub', links: [{ label: 'The Git & GitHub Bootcamp (Udemy)', url: 'https://www.udemy.com/course/git-and-github-bootcamp/?couponCode=KEEPLEARNING' }] },
      { name: 'Bitbucket', links: [] },
      { name: 'JFrog Artifactory', links: [] },
      {
        name: 'Sonatype Nexus',
        links: [{ label: 'Learn Nexus Repository From Scratch (YouTube)', url: 'https://www.youtube.com/watch?v=CNTLIgGGuoQ' }],
      },
    ],
  },
];

@Injectable()
export class LearningResourcesService {
  private readonly portals = [...IAM_PORTALS, ...DEVOPS_PORTALS];
  private readonly referenceGroups = [...IAM_REFERENCE_GROUPS, ...DEVOPS_REFERENCE_GROUPS];

  getPortals(track: 'IAM' | 'DEVOPS') {
    return this.portals.filter((p) => p.track === track);
  }

  getReference(track: 'IAM' | 'DEVOPS') {
    return this.referenceGroups.filter((g) => g.track === track);
  }
}
