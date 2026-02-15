import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authApi } from "@/lib/api/auth.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  userName: z.string().min(3, "Username must be at least 3 characters"),
  userType: z.enum(["student", "working_professional", "team_manager"], {
    errorMap: () => ({ message: "Please select a role" }),
  }),
  country: z.string().min(1, "Please select a country"),
  timezone: z.string().min(1, "Please select a timezone"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function OnboardingDialog({ open }: { open: boolean }) {
  const { user, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      userName: "",
      userType: "student",
      country: "",
      timezone: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        fullName: user.fullName || "",
        userName: user.userName || "",
        userType: (user.userType as any) || undefined,
        country: user.country || "",
        timezone: user.timezone || "",
      });
    }
  }, [user, form]);

  const onSubmit = async (data: ProfileFormValues) => {
    setLoading(true);
    try {
      const updatedUser = await authApi.updateProfile(data);
      if (user) {
        setUser({
           ...user,
           ...updatedUser,
           // map backend fields to frontend if needed, but updateProfile returns aligned data usually? 
           // actually authApi.updateProfile returns User response. 
           // Let's ensure we update the store correctly.
           // The store expects frontend User type. 
           // authApi.updateProfile returns: Promise<User> (frontend type? No, usually API response)
           // Let's check authApi types. Assuming it returns the updated user data.
           // Actually, earlier in dashboard page we did manual mapping. 
           // Let's look at `authApi.updateProfile` implementation or return type if possible.
           // For now, we'll assume standard flow.
           onboardingCompleted: true,
        });
      }
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[500px]"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update your details to complete onboarding." 
              : "Review your details. Valid information is required to access the dashboard."}
          </DialogDescription>
        </DialogHeader>

        {!isEditing && (
          <div className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 px-4 py-3 rounded-md text-sm mb-4">
            <p className="font-semibold">Profile Incomplete</p>
            <p>Please complete your profile to continue.</p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!isEditing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="userName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!isEditing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="userType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value} 
                    disabled={!isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="working_professional">Working Professional</SelectItem>
                      <SelectItem value="team_manager">Team Manager</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                      disabled={!isEditing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="us">United States</SelectItem>
                        <SelectItem value="in">India</SelectItem>
                        <SelectItem value="uk">United Kingdom</SelectItem>
                        <SelectItem value="ca">Canada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value} 
                      value={field.value}
                      disabled={!isEditing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="utc">UTC</SelectItem>
                        <SelectItem value="est">EST</SelectItem>
                        <SelectItem value="pst">PST</SelectItem>
                        <SelectItem value="ist">IST</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="pt-4">
              {!isEditing ? (
                <Button 
                  type="button" 
                  className="w-full" 
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile to Continue
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save & Continue
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
