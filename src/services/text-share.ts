import { Share } from 'react-native';

export interface TextShareService {
  share(title: string, text: string): Promise<void>;
}

export const nativeTextShareService: TextShareService = {
  async share(title, text) {
    await Share.share({ title, message: text });
  },
};
