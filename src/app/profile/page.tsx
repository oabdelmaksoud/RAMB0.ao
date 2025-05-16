import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { UserCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function ProfilePage() {
  return (
    <div className="container mx-auto">
      <PageHeader>
        <PageHeaderHeading>
          <UserCircle className="mr-2 inline-block h-6 w-6" />
          User Profile
        </PageHeaderHeading>
        <PageHeaderDescription>
          View and manage your profile settings.
        </PageHeaderDescription>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 flex flex-col">
          <CardHeader className="items-center text-center">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="person avatar" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <CardTitle className="text-xl">Current User</CardTitle>
            <p className="text-sm text-muted-foreground">user.name@example.com</p>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button variant="outline" className="w-full">Change Avatar</Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" defaultValue="Current User" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" defaultValue="user.name@example.com" disabled />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us a little about yourself"
                defaultValue="Loves building awesome apps with AI and AgentFlow!"
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6 flex justify-end">
            <Button>Save Changes</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
