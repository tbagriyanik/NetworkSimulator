import { describe, expect, it } from 'vitest';
import { answerSdnQuiz, getQuizQuestionsForProject, lessonQuizzes, defaultFallbackQuiz } from '@/lib/network/sdnQuiz';

describe('Lesson-Specific Knowledge Quizzes', () => {
  it('provides 2-3 specific questions per lesson topic', () => {
    const pcCmdQuestions = getQuizQuestionsForProject('pcCmd');
    expect(pcCmdQuestions.length).toBe(3);
    expect(pcCmdQuestions[0].id).toBe('pccmd-1');

    const vlanQuestions = getQuizQuestionsForProject('vlan');
    expect(vlanQuestions.length).toBe(3);

    const dhcpQuestions = getQuizQuestionsForProject('routerDhcp');
    expect(dhcpQuestions.length).toBe(3);
  });

  it('evaluates answers and awards points correctly', () => {
    const resultCorrect = answerSdnQuiz('pccmd-1', 0, 'pcCmd', 'tr');
    expect(resultCorrect.correct).toBe(true);
    expect(resultCorrect.points).toBe(10);
    expect(resultCorrect.explanation).toContain('ipconfig');

    const resultWrong = answerSdnQuiz('pccmd-1', 1, 'pcCmd', 'tr');
    expect(resultWrong.correct).toBe(false);
    expect(resultWrong.points).toBe(0);
  });

  it('covers all predefined lesson topics with valid choices and correct answers', () => {
    for (const [lessonId, questions] of Object.entries(lessonQuizzes)) {
      expect(questions.length, `Lesson ${lessonId} should have 2-3 questions`).toBeGreaterThanOrEqual(2);
      expect(questions.length, `Lesson ${lessonId} should have 2-3 questions`).toBeLessThanOrEqual(3);

      for (const q of questions) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        const choicesTr = Array.isArray(q.choices) ? q.choices : q.choices.tr;
        expect(q.answer).toBeLessThan(choicesTr.length);
      }
    }
  });

  it('supports expanded topics (OSPF, BGP, STP, ACL, NAT, IPv6, Wireless, QoS, SDN, Cybersecurity, Subnetting)', () => {
    expect(getQuizQuestionsForProject('ospf').length).toBe(3);
    expect(getQuizQuestionsForProject('bgp').length).toBe(3);
    expect(getQuizQuestionsForProject('stp').length).toBe(3);
    expect(getQuizQuestionsForProject('acl').length).toBe(3);
    expect(getQuizQuestionsForProject('nat').length).toBe(3);
    expect(getQuizQuestionsForProject('ipv6').length).toBe(3);
    expect(getQuizQuestionsForProject('wireless').length).toBe(3);
    expect(getQuizQuestionsForProject('qos').length).toBe(3);
    expect(getQuizQuestionsForProject('sdn').length).toBe(3);
    expect(getQuizQuestionsForProject('subnetting').length).toBe(3);
    expect(getQuizQuestionsForProject('tcpUdpOsi').length).toBe(3);
  });

  it('normalizes project IDs with kebab-case and case-insensitive aliases', () => {
    expect(getQuizQuestionsForProject('basic-switch').length).toBe(3);
    expect(getQuizQuestionsForProject('router-dhcp').length).toBe(3);
    expect(getQuizQuestionsForProject('static-routing').length).toBe(3);
    expect(getQuizQuestionsForProject('port-security').length).toBe(3);
    expect(getQuizQuestionsForProject('rip-routing').length).toBe(3);
    expect(defaultFallbackQuiz.length).toBeGreaterThanOrEqual(20);
  });
});
