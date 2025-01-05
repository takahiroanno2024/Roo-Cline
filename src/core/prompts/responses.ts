export const formatResponse = {
  toolResult: (text: string, images?: string[]) => {
    if (images && images.length > 0) {
      return [
        { type: 'text', text },
        ...images.map(image => ({
          type: 'image',
          source: { type: 'base64', data: image }
        }))
      ];
    }
    return text;
  },

  toolError: (error: string) => {
    return `Error: ${error}`;
  },

  imageBlocks: (images?: string[]) => {
    if (!images || images.length === 0) return [];
    return images.map(image => ({
      type: 'image',
      source: { type: 'base64', data: image }
    }));
  }
};
