import SuperCommand from '../SuperCommand';
import showProblemList from '@/features/problemList';
import { processAxiosError } from '@/utils/workspaceUtils';

export default new SuperCommand({
  onCommand: 'problemList',
  handle: async () => {
    try {
      await showProblemList();
      return true;
    } catch (error) {
      processAxiosError('获取题目列表')(error);
      return false;
    }
  }
});
