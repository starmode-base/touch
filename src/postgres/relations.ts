import { relations } from "drizzle-orm/relations";
import {
  users,
  contactActivities,
  contacts,
  contactRoles,
  opportunities,
  opportunityActivities,
  passkeys,
  contactRoleAssignments,
  opportunityContactLinks,
} from "./schema";

export const contactActivitiesRelations = relations(
  contactActivities,
  ({ one }) => ({
    user: one(users, {
      fields: [contactActivities.userId],
      references: [users.id],
    }),
    contact: one(contacts, {
      fields: [contactActivities.userId],
      references: [contacts.id],
    }),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  contactActivities: many(contactActivities),
  contacts: many(contacts),
  contactRoles: many(contactRoles),
  opportunities: many(opportunities),
  opportunityActivities: many(opportunityActivities),
  passkeys: many(passkeys),
  contactRoleAssignments: many(contactRoleAssignments),
  opportunityContactLinks: many(opportunityContactLinks),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  contactActivities: many(contactActivities),
  user: one(users, {
    fields: [contacts.userId],
    references: [users.id],
  }),
  contactRoleAssignments: many(contactRoleAssignments),
  opportunityContactLinks: many(opportunityContactLinks),
}));

export const contactRolesRelations = relations(
  contactRoles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [contactRoles.userId],
      references: [users.id],
    }),
    contactRoleAssignments: many(contactRoleAssignments),
  }),
);

export const opportunitiesRelations = relations(
  opportunities,
  ({ one, many }) => ({
    user: one(users, {
      fields: [opportunities.userId],
      references: [users.id],
    }),
    opportunityActivities: many(opportunityActivities),
    opportunityContactLinks: many(opportunityContactLinks),
  }),
);

export const opportunityActivitiesRelations = relations(
  opportunityActivities,
  ({ one }) => ({
    user: one(users, {
      fields: [opportunityActivities.userId],
      references: [users.id],
    }),
    opportunity: one(opportunities, {
      fields: [opportunityActivities.userId],
      references: [opportunities.id],
    }),
  }),
);

export const passkeysRelations = relations(passkeys, ({ one }) => ({
  user: one(users, {
    fields: [passkeys.userId],
    references: [users.id],
  }),
}));

export const contactRoleAssignmentsRelations = relations(
  contactRoleAssignments,
  ({ one }) => ({
    user: one(users, {
      fields: [contactRoleAssignments.userId],
      references: [users.id],
    }),
    contact: one(contacts, {
      fields: [contactRoleAssignments.userId],
      references: [contacts.id],
    }),
    contactRole: one(contactRoles, {
      fields: [contactRoleAssignments.userId],
      references: [contactRoles.id],
    }),
  }),
);

export const opportunityContactLinksRelations = relations(
  opportunityContactLinks,
  ({ one }) => ({
    user: one(users, {
      fields: [opportunityContactLinks.userId],
      references: [users.id],
    }),
    contact: one(contacts, {
      fields: [opportunityContactLinks.userId],
      references: [contacts.id],
    }),
    opportunity: one(opportunities, {
      fields: [opportunityContactLinks.userId],
      references: [opportunities.id],
    }),
  }),
);
