export const makeJobController = ({ dailyContentOrchestrator }) => ({
  runDaily: () => dailyContentOrchestrator(),
});
