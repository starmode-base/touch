import { relations } from "drizzle-orm/relations";
import {
  workspaces,
  contactActivities,
  workspaceMemberships,
  contacts,
  opportunities,
  opportunityActivities,
  users,
  opportunityContactLinks,
} from "./schema";

export const contactActivitiesRelations = relations(
  contactActivities,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [contactActivities.workspaceId],
      references: [workspaces.id],
    }),
    workspaceMembership: one(workspaceMemberships, {
      fields: [contactActivities.workspaceId],
      references: [workspaceMemberships.userId],
    }),
    contact: one(contacts, {
      fields: [contactActivities.workspaceId],
      references: [contacts.id],
    }),
  }),
);

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  contactActivities: many(contactActivities),
  contacts: many(contacts),
  opportunities: many(opportunities),
  opportunityActivities: many(opportunityActivities),
  workspaceMemberships: many(workspaceMemberships),
  opportunityContacts: many(opportunityContactLinks),
}));

export const workspaceMembershipsRelations = relations(
  workspaceMemberships,
  ({ one, many }) => ({
    contactActivities: many(contactActivities),
    opportunityActivities: many(opportunityActivities),
    workspace: one(workspaces, {
      fields: [workspaceMemberships.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceMemberships.userId],
      references: [users.id],
    }),
  }),
);

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  contactActivities: many(contactActivities),
  workspace: one(workspaces, {
    fields: [contacts.workspaceId],
    references: [workspaces.id],
  }),
  opportunityContacts: many(opportunityContactLinks),
}));

export const opportunitiesRelations = relations(
  opportunities,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [opportunities.workspaceId],
      references: [workspaces.id],
    }),
    opportunityActivities: many(opportunityActivities),
    opportunityContacts: many(opportunityContactLinks),
  }),
);

export const opportunityActivitiesRelations = relations(
  opportunityActivities,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [opportunityActivities.workspaceId],
      references: [workspaces.id],
    }),
    workspaceMembership: one(workspaceMemberships, {
      fields: [opportunityActivities.workspaceId],
      references: [workspaceMemberships.userId],
    }),
    opportunity: one(opportunities, {
      fields: [opportunityActivities.workspaceId],
      references: [opportunities.id],
    }),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  workspaceMemberships: many(workspaceMemberships),
}));

export const opportunityContactsRelations = relations(
  opportunityContactLinks,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [opportunityContactLinks.workspaceId],
      references: [workspaces.id],
    }),
    contact: one(contacts, {
      fields: [opportunityContactLinks.workspaceId],
      references: [contacts.id],
    }),
    opportunity: one(opportunities, {
      fields: [opportunityContactLinks.workspaceId],
      references: [opportunities.id],
    }),
  }),
);
