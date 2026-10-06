export type RootStackParamList = {
  Conversations: undefined;
  Users: undefined;
  GroupForm: { groupId?: string } | undefined;
  Chat: { conversationId: string };
  Members: { conversationId: string };
  Profile: { uid: string };
};
