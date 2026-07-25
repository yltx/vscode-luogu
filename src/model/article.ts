import { UserInfoWithIcon } from './user';

export default class ArticleData {
  lid: string;
  author: UserInfoWithIcon;
  content: string;
  adminNote: string | null;
  createTime: number;
  vote: { upvotes: number; voted: -1 | 0 | 1 };
  constructor(article: import('luogu-api').ArticleDetails) {
    this.lid = article.lid;
    this.author = new UserInfoWithIcon(article.author);
    this.content = article.content ?? '';
    this.adminNote = article.adminNote;
    this.createTime = article.time * 1000;
    this.vote = { upvotes: article.upvote, voted: article.voted as -1 | 0 | 1 };
  }
}
