import { useState } from 'react';
import { MoreHorizontal, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { Role, UserStatus } from '@plastimatic/shared';
import { formatDate } from '@plastimatic/shared';
import { PageHeader } from '@/components/page-header';
import { StickyHeader } from '@/components/sticky-header';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PaginationFooter } from '@/components/pagination-footer';
import { TableSkeletonRows } from '@/components/table-skeleton';
import { StatusBadge } from '@/components/status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ApiError } from '@/lib/api-client';
import { useBlockUser, useDeleteUser, useUnblockUser, useUsers } from '../api/users-api';
import { CreateUserDialog } from '../components/create-user-dialog';

const STATUS_TONE = { ACTIVE: 'good', BLOCKED: 'critical', DELETED: 'neutral' } as const;
const STATUS_LABEL: Record<UserStatus, string> = { ACTIVE: 'Actif', BLOCKED: 'Bloqué', DELETED: 'Supprimé' };

const PAGE_SIZE = 10;

export function UsersPage() {
  const [role, setRole] = useState<Role | 'all'>('CUSTOMER');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  // Both are real query params (see users.service.ts's findAll) — not a
  // client-side re-filter of whatever page happens to already be loaded.
  const users = useUsers({
    ...(role === 'all' ? {} : { role }),
    search: search || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const block = useBlockUser();
  const unblock = useUnblockUser();
  const deleteUser = useDeleteUser();

  const updateFilter = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const onError = (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Une erreur est survenue');

  return (
    <div>
      <StickyHeader>
        <PageHeader
          title="Utilisateurs"
          description="Comptes clients et accès à la boutique"
          actions={
            <CreateUserDialog
              trigger={
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Nouvel utilisateur
                </Button>
              }
            />
          }
        />

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un nom ou un e-mail…"
              className="pl-8"
              value={search}
              onChange={(e) => updateFilter(setSearch)(e.target.value)}
            />
          </div>
          <Select value={role} onValueChange={updateFilter(setRole) as (v: string) => void}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CUSTOMER">Clients</SelectItem>
              <SelectItem value="STAFF">Staff</SelectItem>
              <SelectItem value="ADMIN">Admins</SelectItem>
              <SelectItem value="all">Tous</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </StickyHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Inscrit le</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.isLoading && <TableSkeletonRows columns={6} />}
              {users.data?.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={user.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {user.firstName[0]}
                          {user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      {user.firstName} {user.lastName}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge label={STATUS_LABEL[user.status]} tone={STATUS_TONE[user.status]} />
                      {user.mustChangePassword && (
                        <StatusBadge label="Changement de mot de passe requis" tone="warning" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    {user.status !== 'DELETED' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {user.status === 'ACTIVE' ? (
                            <DropdownMenuItem
                              onClick={() =>
                                block.mutate(user.id, {
                                  onSuccess: () => toast.success('Compte bloqué'),
                                  onError,
                                })
                              }
                            >
                              Bloquer
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                unblock.mutate(user.id, {
                                  onSuccess: () => toast.success('Compte débloqué'),
                                  onError,
                                })
                              }
                            >
                              Débloquer
                            </DropdownMenuItem>
                          )}
                          <ConfirmDialog
                            trigger={
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={(e) => e.preventDefault()}
                              >
                                Supprimer
                              </DropdownMenuItem>
                            }
                            title="Supprimer cet utilisateur ?"
                            description={`Le compte de ${user.firstName} ${user.lastName} sera définitivement supprimé. Cette action est irréversible.`}
                            confirmLabel="Supprimer"
                            destructive
                            onConfirm={() =>
                              deleteUser.mutate(user.id, {
                                onSuccess: () => toast.success('Compte supprimé définitivement'),
                                onError,
                              })
                            }
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {users.data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Aucun utilisateur
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {users.data && (
          <PaginationFooter
            page={users.data.page}
            totalPages={users.data.totalPages}
            total={users.data.total}
            pageSize={users.data.pageSize}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}
