export type StoryReferenceKind="CHARACTER"|"LOCATION";

export type StoryReference={
  id:string;
  kind:StoryReferenceKind;
  name:string;
  aliases:string[];
  role:string;
  pronouns:string;
  age:string;
  description:string;
  portraitUrl:string|null;
};
