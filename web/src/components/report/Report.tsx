import type { Report as ReportData } from '../../types/report';
import ActionPlan from './ActionPlan';
import Blame from './Blame';
import Bottlenecks from './Bottlenecks';
import Diagnosis from './Diagnosis';
import Distribution from './Distribution';
import EngineeringSummary from './EngineeringSummary';
import Health from './Health';
import Hero from './Hero';
import Overview from './Overview';
import Recommendations from './Recommendations';
import Simulator from './Simulator';
import TechnicalProfile from './TechnicalProfile';
import VitalsSection from './VitalsSection';

export default function Report({ analysisId, report }: { analysisId: string; report: ReportData }) {
  return (
    <main>
      <Hero report={report} />
      <Overview report={report} />
      <VitalsSection report={report} />
      <TechnicalProfile report={report} />
      <Distribution report={report} />
      <Blame report={report} />
      <Diagnosis report={report} />
      <Bottlenecks report={report} />
      <Recommendations report={report} />
      <Simulator analysisId={analysisId} report={report} />
      <Health report={report} />
      <ActionPlan report={report} />
      <EngineeringSummary report={report} />
      <div className="mt-16 border-t border-line pt-6">
        <a href="#/" className="font-medium text-accent underline underline-offset-4">
          Analyze another website
        </a>
      </div>
    </main>
  );
}
