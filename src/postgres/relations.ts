import { relations } from "drizzle-orm/relations";
import {
  workspaces,
  contactActivities,
  workspaceMemberships,
  contacts,
  contactRoles,
  opportunities,
  opportunityActivities,
  users,
  contactRoleAssignments,
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
      references: [workspaceMemberships.workspaceId],
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
  contactRoles: many(contactRoles),
  opportunities: many(opportunities),
  opportunityActivities: many(opportunityActivities),
  workspaceMemberships: many(workspaceMemberships),
  contactRoleAssignments: many(contactRoleAssignments),
  opportunityContactLinks: many(opportunityContactLinks),
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
  contactRoleAssignments: many(contactRoleAssignments),
  opportunityContactLinks: many(opportunityContactLinks),
}));

export const contactRolesRelations = relations(
  contactRoles,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [contactRoles.workspaceId],
      references: [workspaces.id],
    }),
    contactRoleAssignments: many(contactRoleAssignments),
  }),
);

export const opportunitiesRelations = relations(
  opportunities,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [opportunities.workspaceId],
      references: [workspaces.id],
    }),
    opportunityActivities: many(opportunityActivities),
    opportunityContactLinks: many(opportunityContactLinks),
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
      references: [workspaceMemberships.workspaceId],
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

export const contactRoleAssignmentsRelations = relations(
  contactRoleAssignments,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [contactRoleAssignments.workspaceId],
      references: [workspaces.id],
    }),
    contact: one(contacts, {
      fields: [contactRoleAssignments.workspaceId],
      references: [contacts.id],
    }),
    contactRole: one(contactRoles, {
      fields: [contactRoleAssignments.workspaceId],
      references: [contactRoles.id],
    }),
  }),
);

export const opportunityContactLinksRelations = relations(
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
