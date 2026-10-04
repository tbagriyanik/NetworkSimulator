import { coreLessonQuizzes } from './sdnQuizCoreData';
import { advancedLessonQuizzes } from './sdnQuizAdvancedData';

export interface SdnQuizQuestion {
  id: string;
  question: { tr: string; en: string } | string;
  choices: { tr: string[]; en: string[] } | string[];
  answer: number;
  explanation: { tr: string; en: string } | string;
  points?: number;
}

export const lessonQuizzes: Record<string, SdnQuizQuestion[]> = {
  ...coreLessonQuizzes,
  ...advancedLessonQuizzes
};

// Fallback topic quizzes for general or beginner/intermediate/advanced steps
export const defaultFallbackQuiz: SdnQuizQuestion[] = [
  ...lessonQuizzes.pcCmd,
  ...lessonQuizzes.basicSwitch,
  ...lessonQuizzes.vlan,
  ...lessonQuizzes.routerDhcp,
  ...lessonQuizzes.staticRouting,
  ...lessonQuizzes.portSecurity,
  ...lessonQuizzes.ripRouting,
  ...lessonQuizzes.services,
  ...lessonQuizzes.soho,
  ...lessonQuizzes.basicLan,
  ...lessonQuizzes.campus,
  ...lessonQuizzes.hospital,
  ...lessonQuizzes.ecommerce,
  ...lessonQuizzes.cliBasics,
  ...lessonQuizzes.addDevice,
  ...lessonQuizzes.ospfRouting,
  ...lessonQuizzes.bgpRouting,
  ...lessonQuizzes.stpProtocol,
  ...lessonQuizzes.aclSecurity,
  ...lessonQuizzes.natPat,
  ...lessonQuizzes.ipv6Addressing,
  ...lessonQuizzes.wirelessWlan,
  ...lessonQuizzes.qosTraffic,
  ...lessonQuizzes.sdnNetdevops,
  ...lessonQuizzes.cybersecurity,
  ...lessonQuizzes.subnetting,
  ...lessonQuizzes.tcpUdpOsi,
  ...lessonQuizzes.cliGuidedLessons
];

function normalizeProjectKey(key: string): string {
  return key.toLowerCase().replace(/[-_]/g, '');
}

export function getQuizQuestionsForProject(projectId?: string): SdnQuizQuestion[] {
  if (!projectId) return defaultFallbackQuiz;

  // Direct match
  if (lessonQuizzes[projectId] && lessonQuizzes[projectId].length > 0) {
    return lessonQuizzes[projectId];
  }

  // Normalized key match
  const norm = normalizeProjectKey(projectId);
  for (const [k, v] of Object.entries(lessonQuizzes)) {
    if (normalizeProjectKey(k) === norm && v.length > 0) {
      return v;
    }
  }

  // Substring / domain matching
  if (norm.includes('pccmd') || norm.includes('cmd')) return lessonQuizzes.pcCmd;
  if (norm.includes('basicswitch') || norm.includes('switchbasic')) return lessonQuizzes.basicSwitch;
  if (norm.includes('vlan')) return lessonQuizzes.vlan;
  if (norm.includes('dhcp')) return lessonQuizzes.routerDhcp;
  if (norm.includes('static')) return lessonQuizzes.staticRouting;
  if (norm.includes('security') || norm.includes('portsec')) return lessonQuizzes.portSecurity;
  if (norm.includes('rip')) return lessonQuizzes.ripRouting;
  if (norm.includes('service')) return lessonQuizzes.services;
  if (norm.includes('soho')) return lessonQuizzes.soho;
  if (norm.includes('lan') || norm.includes('basiclan')) return lessonQuizzes.basicLan;
  if (norm.includes('campus')) return lessonQuizzes.campus;
  if (norm.includes('hospital')) return lessonQuizzes.hospital;
  if (norm.includes('ecom') || norm.includes('commerce')) return lessonQuizzes.ecommerce;
  if (norm.includes('device') || norm.includes('cable')) return lessonQuizzes.addDevice;
  if (norm.includes('ospf')) return lessonQuizzes.ospfRouting;
  if (norm.includes('bgp')) return lessonQuizzes.bgpRouting;
  if (norm.includes('stp') || norm.includes('spanning')) return lessonQuizzes.stpProtocol;
  if (norm.includes('acl') || norm.includes('accesslist')) return lessonQuizzes.aclSecurity;
  if (norm.includes('nat') || norm.includes('pat')) return lessonQuizzes.natPat;
  if (norm.includes('ipv6')) return lessonQuizzes.ipv6Addressing;
  if (norm.includes('wireless') || norm.includes('wifi') || norm.includes('wlan')) return lessonQuizzes.wirelessWlan;
  if (norm.includes('qos')) return lessonQuizzes.qosTraffic;
  if (norm.includes('sdn') || norm.includes('netdevops')) return lessonQuizzes.sdnNetdevops;
  if (norm.includes('subnet')) return lessonQuizzes.subnetting;
  if (norm.includes('tcp') || norm.includes('udp') || norm.includes('osi')) return lessonQuizzes.tcpUdpOsi;

  if (norm.includes('teachmebeginner') || norm.includes('tmbeg')) {
    return lessonQuizzes.basicSwitch || defaultFallbackQuiz;
  }
  if (norm.includes('teachmeintermediate') || norm.includes('tmint')) {
    return lessonQuizzes.vlan || defaultFallbackQuiz;
  }
  if (norm.includes('teachmeadvanced') || norm.includes('tmadv')) {
    return lessonQuizzes.routerDhcp || defaultFallbackQuiz;
  }
  if (norm.includes('clilesson') || norm.includes('cliguided')) {
    return lessonQuizzes.cliGuidedLessons || lessonQuizzes.cliBasics || defaultFallbackQuiz;
  }

  return defaultFallbackQuiz;
}

export function answerSdnQuiz(
  questionId: string,
  choice: number,
  projectId?: string,
  language: 'tr' | 'en' = 'tr'
): { correct: boolean; explanation: string; points: number } {
  const pool = getQuizQuestionsForProject(projectId);
  const q = pool.find(x => x.id === questionId) || defaultFallbackQuiz.find(x => x.id === questionId);

  if (!q) {
    throw new Error('Unknown quiz question');
  }

  const isCorrect = choice === q.answer;
  const expStr = typeof q.explanation === 'object' ? (q.explanation[language] || q.explanation.tr) : q.explanation;
  const awardedPoints = isCorrect ? (q.points || 10) : 0;

  return {
    correct: isCorrect,
    explanation: expStr,
    points: awardedPoints
  };
}

// Backward compatibility export for sdnQuizQuestions
export const sdnQuizQuestions: Array<{ id: string; question: string; choices: string[]; answer: number; explanation: string }> = defaultFallbackQuiz.map(q => ({
  id: q.id,
  question: typeof q.question === 'object' ? q.question.tr : q.question,
  choices: Array.isArray(q.choices) ? q.choices : q.choices.tr,
  answer: q.answer,
  explanation: typeof q.explanation === 'object' ? q.explanation.tr : q.explanation
}));
