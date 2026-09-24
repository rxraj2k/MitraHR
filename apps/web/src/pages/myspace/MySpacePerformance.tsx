import MyPerformance from '../performance/MyPerformance';

// My Space's "Performance" sub-view — reuses the existing MyPerformance
// page as-is (it already renders its own heading and is self-contained, no
// route params), just mounted under the My Space workspace now too.
export default function MySpacePerformance() {
  return <MyPerformance />;
}
